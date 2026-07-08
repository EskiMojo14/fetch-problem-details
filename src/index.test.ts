import { expect, it, describe } from "vite-plus/test";

import * as _f from "./__fixtures.ts";
import { ExtendedRequest, ProblemResponse, defineProblem } from "./index.ts";

describe("ExtendedRequest", () => {
  it("should create an ExtendedRequest with JSON body and default headers", async () => {
    const request = ExtendedRequest.json("https://example.com/test", { key: "value" });
    expect(request).toBeInstanceOf(Request);
    expect(request).toBeInstanceOf(ExtendedRequest);
    expect(request.method).toBe("POST");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    await expect(request.json()).resolves.toEqual({ key: "value" });
  });

  it("should respect custom headers and method", async () => {
    const request = ExtendedRequest.json(
      "https://example.com/test",
      { key: "value" },
      {
        method: "PUT",
        headers: {
          "X-Custom-Header": "CustomValue",
          "Content-Type": "text/plain", // should not override this
        },
      },
    );
    expect(request.method).toBe("PUT");
    expect(request.headers.get("X-Custom-Header")).toBe("CustomValue");
    expect(request.headers.get("Content-Type")).toBe("text/plain");
    await expect(request.json()).resolves.toEqual({ key: "value" });
  });
});

describe("ProblemResponse", () => {
  it("should create a ProblemResponse with default status", async () => {
    const response = ProblemResponse.problem({
      ..._f.outOfCreditProblem,
      type: _f.outofCreditType,
      status: undefined, // should default to 500
    });
    expect(response).toBeInstanceOf(Response);
    expect(response).toBeInstanceOf(ProblemResponse);
    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    await expect(response.json()).resolves.toEqual({
      ..._f.outOfCreditProblem,
      type: _f.outofCreditType,
      status: undefined,
    });
  });
  it("should create a ProblemResponse with custom status", () => {
    const response = ProblemResponse.problem({
      status: 403,
    });
    expect(response.status).toBe(403);
  });
  it("respects custom headers and does not override Content-Type if provided", () => {
    const headers = new Headers({
      "X-Custom-Header": "CustomValue",
      "Content-Type": "application/json",
    });
    const response = ProblemResponse.problem({}, { headers });
    expect(response.headers.get("X-Custom-Header")).toBe("CustomValue");
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("defineProblem", () => {
  const problems = {
    OutOfCredit: defineProblem(
      _f.outofCreditType,
      _f.outofCreditSchema,
      (detail: string, instance: string, accounts: Array<string>) => ({
        title: "You do not have enough credit.",
        status: 403,
        detail,
        instance,
        accounts,
      }),
    ),
    IAmATeapot: defineProblem(_f.iAmATeapotType, _f.iAmATeapotSchema, () => [
      { title: "I'm a teapot", status: 418 },
      {
        headers: {
          "X-Custom-Header": "CustomValue",
        },
      },
    ]),
  };

  it("should create a ProblemResponse using the defined problem", async () => {
    const problem = problems.OutOfCredit(
      "Your current balance is 30, but that costs 50.",
      "/account/12345/msgs/abc",
      ["/account/12345", "/account/67890"],
    );
    expect(problem).toBeInstanceOf(Response);
    expect(problem).toBeInstanceOf(ProblemResponse);
    expect(problem.status).toBe(403);
    await expect(problem.json()).resolves.toEqual({
      type: "https://example.com/probs/out-of-credit",
      title: "You do not have enough credit.",
      detail: "Your current balance is 30, but that costs 50.",
      status: 403,
      instance: "/account/12345/msgs/abc",
      accounts: ["/account/12345", "/account/67890"],
    });
  });
  it("should create a ProblemResponse with custom init using the defined problem", async () => {
    const problem = problems.IAmATeapot();
    expect(problem).toBeInstanceOf(Response);
    expect(problem).toBeInstanceOf(ProblemResponse);
    expect(problem.status).toBe(418);
    expect(problem.headers.get("X-Custom-Header")).toBe("CustomValue");
    await expect(problem.json()).resolves.toEqual({
      type: _f.iAmATeapotType,
      title: "I'm a teapot",
      status: 418,
    });
  });
});
