import type {
  LooseProblemDetails,
  ProblemConstructResult,
  ProblemFactory,
  ProblemSchema,
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

// #__NO_SIDE_EFFECTS__
export function defineProblem<
  const TType extends string,
  TSchema extends ProblemSchema<TType>,
  TArgs extends any[],
>(
  type: TType,
  schema: TSchema,
  construct: (...args: TArgs) => ProblemConstructResult<TType, TSchema>,
): ProblemFactory<TType, TSchema, TArgs> {
  function parse(value: unknown) {
    // always make sure the problem details follow RFC 9457, before allowing custom problem definitions to be used
    standardSchema.parseSync(standardSchema.problemDetailsSchema, value);
    return standardSchema.parseSync(schema, value);
  }
  return Object.assign(
    function constructProblem(...args: TArgs) {
      const constructed = construct(...args);
      const [problem, init] = Array.isArray(constructed) ? constructed : [constructed, undefined];
      const withType = { ...problem, type };
      parse(withType); // validate the problem details before creating a response (but don't use parsed value)
      return ProblemResponse.problem(withType, init);
    },
    {
      parse,
      safeParse(value: unknown) {
        const { issues: baseIssues } = standardSchema.safeParseSync(
          standardSchema.problemDetailsSchema,
          value,
        );
        const parseResult = standardSchema.safeParseSync(schema, value);
        if (baseIssues || parseResult.issues) {
          return {
            issues: [...(baseIssues ?? []), ...(parseResult.issues ?? [])],
          };
        }
        return { value: parseResult.value };
      },
      type,
      schema,
    },
  );
}

export type { ProblemDetails, LooseProblemDetails, ProblemFactory } from "./types.ts";
export { problemDetailsSchema } from "./standard.ts";
export { matchProblem } from "./match.ts";
