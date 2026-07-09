import * as standardSchema from "./standard.ts";
import type {
  LooseProblemDetails,
  ProblemConstructResult,
  ProblemFactory,
  ProblemSchema,
} from "./types.ts";

type RequestInfo = ConstructorParameters<typeof Request>[0];

/**
 * A Request subclass that can be used as a Promise, allowing you to use `await` directly on it.
 */
export class FetchableRequest extends Request implements PromiseLike<Response> {
  /**
   * Fetches the request and returns a Promise that resolves to the Response.
   * This allows you to use `await` directly on the FetchableRequest instance.
   *
   * @param init - Optional RequestInit object to customize the request.
   * @returns A Promise that resolves to the Response of the fetch operation.
   */
  fetch(init?: RequestInit): Promise<Response> {
    return fetch(this, init);
  }
  // oxlint-disable-next-line unicorn/no-thenable
  then<TResult1 = Response, TResult2 = never>(
    onfulfilled?: ((value: Response) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.fetch().then(onfulfilled, onrejected);
  }
  /**
   * Creates a new `FetchableRequest` instance with the specified JSON body and Content-Type header set to `application/json`.
   * If the `Content-Type` header is already present in the provided `init` object, it will not be overridden.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param body - The JSON body to be sent with the request.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static json(input: RequestInfo, body: any, init?: RequestInit): FetchableRequest {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return new FetchableRequest(input, {
      ...init,
      method: init?.method ?? "POST",
      body: JSON.stringify(body),
      headers,
    });
  }
}

/**
 * A Response subclass that represents a problem details response as defined in RFC 7807.
 * It provides a static method to create a problem response with the appropriate status code and Content-Type header.
 */
export class ProblemResponse extends Response {
  /**
   * Creates a new `ProblemResponse` instance with the specified problem details and optional response initialization options.
   * The `Content-Type` header is set to `application/problem+json` if not already present in the provided `init` object.
   *
   * @param problem - The problem details object conforming to RFC 7807.
   * @param init - Optional ResponseInit object to customize the response.
   * @returns A new `ProblemResponse` instance.
   */
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
 * Defines a problem factory that creates problem responses based on the provided type, schema, and construction function.
 * The factory ensures that the constructed problem details conform to both the RFC 7807 standard and the provided schema.
 *
 * @param type - The unique type identifier for the problem.
 * @param schema - The schema that the problem details must conform to.
 * @param construct - A function that constructs the problem details based on the provided arguments.
 * @returns A problem factory that can be used to create problem responses.
 *
 * @example
 * const IAmATeapot = defineProblem(
 *   "https://example.com/probs/i-am-a-teapot",
 *   v.object({
 *    title: v.literal("I'm a teapot"),
 *    status: v.literal(418),
 *    tea: v.optional(v.string()),
 *   }),
 *   (tea?: string) => ({ title: "I'm a teapot", status: 418, tea }),
 * );
 *
 * const response = IAmATeapot("Earl Grey"); // Creates a ProblemResponse with the specified problem details.
 *
 * console.log(response.status); // 418
 * console.log(response.headers.get("Content-Type")); // "application/problem+json"
 * console.log(await response.json()); // { type: "https://example.com/probs/i-am-a-teapot", title: "I'm a teapot", status: 418, tea: "Earl Grey" }
 */
// #__NO_SIDE_EFFECTS__
export function defineProblem<
  const TType extends string,
  TSchema extends ProblemSchema<TType>,
  TArgs extends Array<any>,
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
export * as standardSchema from "./standard.ts";
export { matchProblem } from "./match.ts";
