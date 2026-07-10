import * as standardSchema from "./standard.ts";
import type {
  LooseProblemDetails,
  ProblemConstructResult,
  ProblemFactory,
  ProblemDefinition,
  ProblemSchema,
} from "./types.ts";

type RequestInfo = ConstructorParameters<typeof Request>[0];

// #__NO_SIDE_EFFECTS__
function createMethod(method: string) {
  return function (input: RequestInfo, init?: Omit<RequestInit, "method">) {
    return new FetchableRequest(input, {
      ...init,
      method,
    });
  };
}

// #__NO_SIDE_EFFECTS__
function createBodyMethod(method: string) {
  const factory = createMethod(method);
  return Object.assign(factory, {
    /**
     * Creates a new `FetchableRequest` instance with the specified JSON body and Content-Type header set to `application/json`.
     * If the `Content-Type` header is already present in the provided `init` object, it will not be overridden.
     * Uses the specified HTTP method for the request.
     *
     * @param input - The input for the request, typically a URL or another Request object.
     * @param body - The JSON body to be sent with the request.
     * @param init - Optional RequestInit object to customize the request.
     * @returns A new `FetchableRequest` instance.
     */
    json(input: RequestInfo, body: any, init?: Omit<RequestInit, "method">) {
      const headers = new Headers(init?.headers);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return factory(input, {
        ...init,
        body: JSON.stringify(body),
        headers,
      });
    },
    /**
     * Creates a new `FetchableRequest` instance with the specified FormData body.
     * Uses the specified HTTP method for the request.
     *
     * @param input - The input for the request, typically a URL or another Request object.
     * @param body - The FormData body to be sent with the request.
     * @param init - Optional RequestInit object to customize the request.
     * @returns A new `FetchableRequest` instance.
     */
    formData(input: RequestInfo, body: FormData, init?: Omit<RequestInit, "method">) {
      return factory(input, {
        ...init,
        body,
      });
    },
  });
}

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
   * @remarks Defaults method to POST if not specified in `init`.
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
  /**
   * Creates a new `FetchableRequest` instance with the specified FormData body.
   *
   * @remarks Defaults method to POST if not specified in `init`.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param body - The FormData body to be sent with the request.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static formData(input: RequestInfo, body: FormData, init?: RequestInit): FetchableRequest {
    return new FetchableRequest(input, {
      ...init,
      method: init?.method ?? "POST",
      body,
    });
  }
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to GET.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static get = createMethod("GET");
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to HEAD.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static head = createMethod("HEAD");
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to POST.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static post = createBodyMethod("POST");
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to PUT.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static put = createBodyMethod("PUT");
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to PATCH.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static patch = createBodyMethod("PATCH");
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to DELETE.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static delete = createMethod("DELETE");
  /**
   * Creates a new `FetchableRequest` instance with the HTTP method set to QUERY.
   *
   * @param input - The input for the request, typically a URL or another Request object.
   * @param init - Optional RequestInit object to customize the request.
   * @returns A new `FetchableRequest` instance.
   */
  static query = createBodyMethod("QUERY");
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
 * Defines a problem to match against.
 *
 * @param type - The unique type identifier for the problem.
 * @param schema - The schema that the problem details must conform to.
 * @returns A problem definition that can be used to match against problem responses.
 *
 * @example
 * const IAmATeapot = defineProblem(
 *   "https://example.com/probs/i-am-a-teapot",
 *   v.object({
 *    title: v.literal("I'm a teapot"),
 *    status: v.literal(418),
 *    tea: v.optional(v.string()),
 *   }),
 * );
 */
export function defineProblem<const TType extends string, TSchema extends ProblemSchema<TType>>(
  type: TType,
  schema: TSchema,
): ProblemDefinition<TType, TSchema>;

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
export function defineProblem<
  const TType extends string,
  TSchema extends ProblemSchema<TType>,
  TArgs extends Array<any>,
>(
  type: TType,
  schema: TSchema,
  construct: (...args: TArgs) => ProblemConstructResult<TType, TSchema>,
): ProblemFactory<TType, TSchema, TArgs>;

// #__NO_SIDE_EFFECTS__
export function defineProblem<
  const TType extends string,
  TSchema extends ProblemSchema<TType>,
  TArgs extends Array<any>,
>(
  type: TType,
  schema: TSchema,
  construct?: (...args: TArgs) => ProblemConstructResult<TType, TSchema>,
): ProblemFactory<TType, TSchema, TArgs> | ProblemDefinition<TType, TSchema> {
  const definition: ProblemDefinition<TType, TSchema> = { type, schema };
  if (!construct) return definition;
  return Object.assign(function constructProblem(...args: TArgs) {
    const constructed = construct(...args);
    const [problem, init] = Array.isArray(constructed) ? constructed : [constructed, undefined];
    const withType = { ...problem, type };
    // check against RFC first
    standardSchema.parseSync(standardSchema.problemDetailsSchema, withType);
    // then check against the provided schema
    standardSchema.parseSync(schema, withType);
    return ProblemResponse.problem(withType, init);
  }, definition);
}

export type { ProblemDetails, LooseProblemDetails, ProblemFactory } from "./types.ts";
export { matchProblem } from "./match.ts";
