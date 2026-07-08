import * as standardSchema from "./standard.ts";
import type {
  LooseProblemDetails,
  ProblemConstructResult,
  ProblemFactory,
  ProblemSchema,
} from "./types.ts";

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
  return Object.assign(
    function constructProblem(...args: TArgs) {
      const constructed = construct(...args);
      const [problem, init] = Array.isArray(constructed) ? constructed : [constructed, undefined];
      const withType = { ...problem, type };
      // check against RFC first
      standardSchema.parseSync(standardSchema.problemDetailsSchema, withType);
      // then check against the provided schema
      standardSchema.parseSync(schema, withType);
      return ProblemResponse.problem(withType, init);
    },
    { type, schema },
  );
}

export type { ProblemDetails, LooseProblemDetails, ProblemFactory } from "./types.ts";
export { problemDetailsSchema } from "./standard.ts";
export { matchProblem } from "./match.ts";
