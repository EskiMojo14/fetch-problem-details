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
 * Declares a set of problem definitions and returns a set of corresponding problem factories.
 * Each factory can be used to construct a ProblemResponse for the corresponding problem definition.
 *
 * @param definitions - An object containing problem definitions, where each key is a unique problem name and the value is a ProblemDefinition.
 * @returns An object containing problem factories, where each key corresponds to a problem definition and the value is a factory function for creating ProblemResponse instances.
 *
 * @example
 * const problems = defineProblems({
 *   OutOfCredit: {
 *     schema: v.object({
 *       type: v.literal("https://example.com/probs/out-of-credit"),
 *       title: v.literal("You do not have enough credit."),
 *       detail: v.string(),
 *       instance: v.string(),
 *       accounts: v.array(v.string()),
 *     }),
 *     construct(detail: string, instance: string, accounts: string[]) {
 *       return {
 *         type: "https://example.com/probs/out-of-credit",
 *         title: "You do not have enough credit.",
 *         status: 403,
 *         detail,
 *         instance,
 *         accounts,
 *       } as const;
 *     },
 *   },
 * });
 *
 * const response = problems.OutOfCredit(
 *  "Your current balance is 30, but that costs 50.",
 *  "/account/123",
 *  ["account1", "account2"]
 * );
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
