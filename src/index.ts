import type {
  LooseProblemDetails,
  ProblemDefinitions,
  ValidateProblemDefinitions,
  ProblemFactories,
} from "./types.ts";
import * as standardSchema from "./standard.ts";

export class ProblemResponse extends Response {
  static problem(
    problem: LooseProblemDetails,
    init?: Omit<ResponseInit, "status">,
  ): ProblemResponse {
    const { status = 500 } = problem;
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/problem+json");
    }
    return Object.setPrototypeOf(
      Response.json(problem, {
        ...init,
        status,
        headers,
      }),
      ProblemResponse.prototype,
    );
  }
}

/**
 *
 * @param definitions
 * @returns
 */
// #__NO_SIDE_EFFECTS__
export function defineProblems<T extends ProblemDefinitions>(
  definitions: ValidateProblemDefinitions<T>,
): ProblemFactories<T> {
  return Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => {
      function parse(value: unknown) {
        // always make sure the problem details follow RFC 9457, before allowing custom problem definitions to be used
        standardSchema.parseSync(standardSchema.problemDetailsSchema, value);
        return standardSchema.parseSync(definition.schema, value);
      }
      return [
        key,
        Object.assign(
          function construct(...args: Parameters<typeof definition.construct>) {
            const constructed = definition.construct(...args);
            const [problem, init] = Array.isArray(constructed)
              ? constructed
              : [constructed, undefined];
            parse(problem); // validate the problem details before creating a response
            return ProblemResponse.problem(problem, init);
          },
          {
            parse,
            safeParse(value: unknown) {
              const { issues: baseIssues } = standardSchema.safeParseSync(
                standardSchema.problemDetailsSchema,
                value,
              );
              const parseResult = standardSchema.safeParseSync(definition.schema, value);
              if (baseIssues || parseResult.issues) {
                return {
                  issues: [...(baseIssues ?? []), ...(parseResult.issues ?? [])],
                };
              }
              return { value: parseResult.value };
            },
          },
        ),
      ];
    }),
  ) as ProblemFactories<T>;
}

export type {
  ProblemDetails,
  LooseProblemDetails,
  ProblemDefinition,
  ProblemDefinitions,
  ValidateProblemDefinitions,
  ProblemFactory,
  ProblemFactories,
} from "./types.ts";
export { problemDetailsSchema } from "./standard.ts";
