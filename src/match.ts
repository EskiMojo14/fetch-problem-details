import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { OneOf, ProblemFactory, LooseProblemDetails } from "./types.ts";
import * as standardSchema from "./standard.ts";

export type ProblemFactories = Array<ProblemFactory> | Record<PropertyKey, ProblemFactory>;
export type ParsedProblem<TFactories extends ProblemFactories> =
  TFactories extends Array<infer TFactory extends ProblemFactory>
    ? StandardSchemaV1.InferOutput<TFactory["schema"]>
    : TFactories extends Record<PropertyKey, infer TFactory extends ProblemFactory>
      ? StandardSchemaV1.InferOutput<TFactory["schema"]>
      : never;

export namespace MatchResult {
  /** A problem that matches one of the provided problem types */
  export type KnownProblem<TFactories extends ProblemFactories> = {
    matched: true;
    isProblem: true;
    type: string;
    problem: ParsedProblem<TFactories>;
  };
  /** A valid problem, but not one of the provided problem types */
  export type UnknownProblem = {
    matched: false;
    isProblem: true;
    problem: LooseProblemDetails;
    // if it matches a type, but not the schema, we can provide the type and issues
    type?: string;
    issues?: readonly StandardSchemaV1.Issue[];
  };
  /** A response that is not a valid problem, or failed validation */
  export type NotAProblem = {
    matched: false;
    reason?: {
      contentType?: string | null;
      status?: number;
      jsonError?: unknown;
      issues?: readonly StandardSchemaV1.Issue[];
    };
    problem?: unknown;
  };
}

export type MatchResult<TFactories extends ProblemFactories> = OneOf<
  MatchResult.KnownProblem<TFactories> | MatchResult.UnknownProblem | MatchResult.NotAProblem
>;

export interface MatchOptions {
  /**
   * Whether to require the Content-Type header to be "application/problem+json" when parsing the response.
   * If true, the parse will fail if the Content-Type is not "application/problem+json".
   * If false, the parse will attempt to parse the response body regardless of the Content-Type.
   * @default true
   *
   * @remarks Some servers may only use "application/json" for problem responses, so you may want to set this to false in those cases.
   */
  requireContentType?: boolean;
  /**
   * Whether to require the response status code to be an error (4xx or 5xx) when parsing the response.
   * If true, the parse will fail if the status code is not an error.
   * If false, the parse will attempt to parse the response body regardless of the status code.
   * @remarks Some servers may return problem responses with non-error status codes, so you may want to set this to false in those cases.
   * @default true
   */
  requireErrorStatus?: boolean;
  /**
   * Whether to clone the response before parsing it.
   * If true, the response will be cloned and the original response will remain untouched.
   * If false, the response will be consumed and cannot be read again.
   * @default false
   *
   * @remarks Cloning the response can be useful if you need to read the response body multiple times,
   * but it may have performance implications. Use this option with caution.
   */
  shouldClone?: boolean;
}

/**
 * Matches a Response against a set of problem factories, returning the result of the match.
 * If the response is a valid problem, it will be parsed and returned as a known or unknown problem.
 * If the response is not a valid problem, the reason for the failure will be returned.
 *
 * @param response The Response instance to parse
 * @param problems The problem factories to match against
 * @param options The options for matching the problem
 * @returns The result of the match
 *
 * @example
 * const response = fetch("https://example.com/payments/123", { method: "POST" });
 * if (!response.ok) {
 *   const matchResult = await matchProblem(response, problems);
 *   if (matchResult.isProblem) {
 *     if (matchResult.matched) {
 *       // handle known problem
 *        switch (matchResult.type) {
 *          case problems.OutOfCredit.type:
 *            // handle OutOfCredit problem
 *            break;
 *        }
 *     } else {
 *       // handle unknown problem
 *     }
 *   } else {
 *     // handle non-problem response or parse failure
 *     console.error("Failed to parse problem response:", matchResult.reason);
 *   }
 * }
 */
export async function matchProblem<TFactories extends ProblemFactories>(
  response: Response,
  problems: TFactories,
  options: MatchOptions = {},
): Promise<MatchResult<TFactories>> {
  const { requireContentType = true, requireErrorStatus = true, shouldClone = false } = options;
  if (requireContentType) {
    const contentType = response.headers.get("Content-Type");
    if (contentType !== "application/problem+json")
      return { matched: false, reason: { contentType } };
  }
  if (requireErrorStatus && (response.status < 400 || response.status >= 600)) {
    return { matched: false, reason: { status: response.status } };
  }
  const known: ProblemFactory[] = Array.isArray(problems) ? problems : Object.values(problems);

  if (shouldClone) response = response.clone();
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return { matched: false, reason: { jsonError: error } };
  }
  const baseParseResult = await standardSchema.safeParse(standardSchema.problemDetailsSchema, body);
  if (!baseParseResult.issues) {
    const intermediate = baseParseResult.value;
    for (const problemFactory of known) {
      const { type, schema } = problemFactory;
      if (intermediate.type === type) {
        const parseResult = await standardSchema.safeParse(schema, intermediate);
        return !parseResult.issues
          ? {
              matched: true,
              isProblem: true,
              problem: parseResult.value as never,
              type,
            }
          : {
              matched: false,
              isProblem: true,
              problem: intermediate,
              type,
              issues: parseResult.issues,
            };
      }
    }
    return {
      matched: false,
      isProblem: true,
      problem: intermediate,
    };
  } else {
    return {
      matched: false,
      reason: { issues: baseParseResult.issues },
    };
  }
}
