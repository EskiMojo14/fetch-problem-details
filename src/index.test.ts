import { expect, it, describe } from "vite-plus/test";

import * as _f from "../tests/__fixtures.ts";
import { ExtendedRequest, ProblemResponse, defineProblem } from "./index.ts";

describe("ExtendedRequest", () => {
  it("should create an ExtendedRequest with JSON body and default headers", async () => {
    const request = ExtendedRequest.json("https://example.com/test", { key: "value" });
    expect(request).toBeInstanceOf(Request);
    expect(request).toBeInstanceOf(ExtendedRequest);
    expect(request).toHaveMethod("POST");
    expect(request).toHaveHeader("Content-Type", "application/json");
    await expect(request).toHaveJSONBody({ key: "value" });
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
    expect(request).toHaveMethod("PUT");
    expect(request).toHaveHeader("X-Custom-Header", "CustomValue");
    expect(request).toHaveHeader("Content-Type", "text/plain");
    await expect(request).toHaveJSONBody({ key: "value" });
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
    expect(response).toHaveStatus(500);
    expect(response).toHaveHeader("Content-Type", "application/problem+json");
    await expect(response).toHaveJSONBody({
      ..._f.outOfCreditProblem,
      type: _f.outofCreditType,
      status: undefined,
    });
  });
  it("should create a ProblemResponse with custom status", () => {
    const response = ProblemResponse.problem({
      status: 403,
    });
    expect(response).toHaveStatus(403);
  });
  it("respects custom headers and does not override Content-Type if provided", () => {
    const headers = new Headers({
      "X-Custom-Header": "CustomValue",
      "Content-Type": "application/json",
    });
    const response = ProblemResponse.problem({}, { headers });
    expect(response).toHaveHeader("X-Custom-Header", "CustomValue");
    expect(response).toHaveHeader("Content-Type", "application/json");
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
    expect(problem).toHaveStatus(403);
    await expect(problem).toHaveJSONBody({
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
    expect(problem).toHaveStatus(418);
    expect(problem).toHaveHeader("X-Custom-Header", "CustomValue");
    await expect(problem).toHaveJSONBody({
      type: _f.iAmATeapotType,
      title: "I'm a teapot",
      status: 418,
    });
  });
});
