# problem-response

An implementation of [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457) for TypeScript.

## `ProblemResponse`

A subclass of `Response` that adds a static `problem()` method for creating a problem response with the appropriate headers.

```ts
import { ProblemResponse } from "problem-response";

const response = ProblemResponse.problem(
  // problem details
  {
    type: "https://example.com/probs/out-of-credit",
    title: "You do not have enough credit.",
    status: 403,
    detail: "Your current balance is 30, but that costs 50.",
    instance: "/account/12345/msgs/abc",
    accounts: ["/account/12345", "/account/67890"],
  },
  // optional init object
  {
    headers: {
      "X-Custom-Header": "Custom value",
    },
  },
);

// equivalent to:
const response = Response.json(
  {
    type: "https://example.com/probs/out-of-credit",
    title: "You do not have enough credit.",
    status: 403,
    detail: "Your current balance is 30, but that costs 50.",
    instance: "/account/12345/msgs/abc",
    accounts: ["/account/12345", "/account/67890"],
  },
  {
    status: 403,
    headers: {
      "Content-Type": "application/problem+json",
      "X-Custom-Header": "Custom value",
    },
  },
);
```

## `defineProblem`

A helper function for defining a problem type with a schema and factory function for constructing problem details.

**Note: Asynchronous schema validation is not supported. The schema must be synchronous.**

```ts
// problems.ts
import * as v from "valibot";
import { defineProblem } from "problem-response";

export const OutOfCredit = defineProblem(
  // problem type URI
  "https://example.com/probs/out-of-credit",
  // schema for full problem details
  v.object({
    title: v.literal("You do not have enough credit."),
    status: v.literal(403),
    detail: v.string(),
    instance: v.pipe(v.string(), v.toUpperCase()),
    accounts: v.array(v.string()),
  }),
  // factory for constructing problem details from arguments
  (detail: string, instance: string, accounts: string[]) =>
    ({
      title: "You do not have enough credit.",
      status: 403,
      detail,
      instance,
      accounts,
    }),
});

// can also customise ResponseInit, e.g. to add headers
export const IAmATeapot = defineProblem(
  "https://example.com/probs/i-am-a-teapot",
  v.object({
    title: v.literal("I am a teapot."),
    status: v.literal(418),
    detail: v.string(),
  }),
  (detail: string) => [
    // problem details
    {
      title: "I am a teapot.",
      status: 418,
      detail,
    },
    // ResponseInit
    {
      headers: {
        "X-Teapot": "true",
      },
    }
  ],
);

// app.ts
import { Hono } from "hono";
import * as problems from "./problems";

const app = new Hono();

app.get("/purchase", (c) => {
  // constructs a Response instance with the problem details and status code
  return problems.OutOfCredit(
    "Your current balance is 30, but that costs 50.",
    "/account/12345/msgs/abc",
    ["/account/12345", "/account/67890"],
  );
});

export default app;
```

## `matchProblem`

A function for matching a `Response` against a set of defined problems, returning the matched problem details if any.

```ts
import * as problems from "./problems";
import { FetchableRequest, matchProblem } from "problem-response";

const response = await FetchableRequest.json("/purchase", {
  item: 123456,
  quantity: 2,
});
const matchResult = await matchProblem(response, problems);
if (matchResult.matched) {
  console.log("Matched problem type:", matchResult.type);
  console.log("Problem details:", matchResult.problem);
} else if (matchResult.isProblem) {
  console.log("Matched a problem, but not a known type.");
  console.log("Problem details:", matchResult.problem);
} else {
  console.log("Not a problem response.", matchResult.reason);
}
```

By default it will also:

- Check that the `Content-Type` header is `application/problem+json`.
- Check that the `status` code is an expected HTTP error code (4xx or 5xx).

This can be configured by passing options to `matchProblem`:

```ts
const matchResult = await matchProblem(response, problems, {
  requireContentType: false,
  requireErrorStatus: false,
});
```

You can also instruct `matchProblem` to clone the response body before parsing, so that it can be read again later:

```ts
const matchResult = await matchProblem(response, problems, {
  shouldClone: true,
});

const body = await response.json(); // can still read the body after matching
```

## `FetchableRequest`

A subclass of `Request` with a `fetch()` method that returns a `Promise<Response>`. It's also thenable, so you can `await` it directly.

For consistency with `Response`, it also adds a static `json()` method for creating a JSON request with the appropriate headers (defaulting the method to `POST`).

```ts
import { FetchableRequest } from "problem-response";

const request = FetchableRequest.json(
  "/purchase",
  { item: 123456, quantity: 2 },
  {
    headers: {
      "X-Custom-Header": "Custom value",
    },
  },
);
// equivalent to:
const request = new FetchableRequest("/purchase", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Custom-Header": "Custom value",
  },
  body: JSON.stringify({ item: 123456, quantity: 2 }),
});

const response = await request;
// equivalent to:
const response = await request.fetch();
// equivalent to:
const response = await fetch(request);
```
