import { http, HttpResponse } from "msw";
import { expect, describe, it } from "vite-plus/test";

import * as f from "../tests/fixtures.ts";
import { server } from "../tests/server.ts";
import { FetchableRequest, ProblemResponse, defineProblem } from "./index.ts";

describe("FetchableRequest", () => {
  it("should create a FetchableRequest with JSON body and default headers", async () => {
    const request = FetchableRequest.json("https://example.com/test", { key: "value" });
    expect(request).toBeInstanceOf(Request);
    expect(request).toBeInstanceOf(FetchableRequest);
    expect(request).toHaveMethod("POST");
    expect(request).toHaveHeader("Content-Type", "application/json");
    await expect(request).toHaveJSONBody({ key: "value" });
  });

  it("should respect custom headers and method", async () => {
    const request = FetchableRequest.json(
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

  it("should create a FetchableRequest with FormData body and default headers", async () => {
    const formData = new FormData();
    formData.append("key", "value");
    const request = FetchableRequest.formData("https://example.com/test", formData);
    expect(request).toBeInstanceOf(Request);
    expect(request).toBeInstanceOf(FetchableRequest);
    expect(request).toHaveMethod("POST");
    // coming soon
    // await expect(request).toHaveFormDataBody(formData);
    await expect(request.formData()).resolves.toBeInstanceOf(FormData);
  });

  it("should fetch the request and return a Response", async () => {
    server.use(
      http.get("https://example.com/test", () => HttpResponse.json({ message: "Hello, world!" })),
    );
    const request = new FetchableRequest("https://example.com/test");
    const response = await request.fetch();
    expect(response).toBeInstanceOf(Response);
    expect(response).toHaveStatus(200);
    await expect(response).toHaveJSONBody({ message: "Hello, world!" });
  });

  it("should be thenable and return a Response", async () => {
    server.use(
      http.get("https://example.com/test", () => HttpResponse.json({ message: "Hello, world!" })),
    );
    const request = new FetchableRequest("https://example.com/test");
    const response = await request;
    expect(response).toBeInstanceOf(Response);
    expect(response).toHaveStatus(200);
    await expect(response).toHaveJSONBody({ message: "Hello, world!" });
  });

  describe("should have static methods for each HTTP method", () => {
    describe.each(["get", "head", "delete"] as const)("no body: FetchableRequest.%s", (method) => {
      it(`should create a FetchableRequest with ${method.toUpperCase()} method`, () => {
        const request = FetchableRequest[method]("https://example.com/test");
        expect(request).toBeInstanceOf(Request);
        expect(request).toBeInstanceOf(FetchableRequest);
        expect(request).toHaveMethod(method.toUpperCase());
      });
      it("should not have body static methods", () => {
        expect(FetchableRequest[method]).not.toHaveProperty("json");
        expect(FetchableRequest[method]).not.toHaveProperty("formData");
      });
    });

    describe.each(["post", "put", "patch", "query"] as const)(
      "with body: FetchableRequest.%s",
      (method) => {
        it(`should create a FetchableRequest with ${method.toUpperCase()} method`, () => {
          const request = FetchableRequest[method]("https://example.com/test");
          expect(request).toBeInstanceOf(Request);
          expect(request).toBeInstanceOf(FetchableRequest);
          expect(request).toHaveMethod(method.toUpperCase());
        });
        it("should create a FetchableRequest with JSON body and default headers", async () => {
          const request = FetchableRequest[method].json("https://example.com/test", {
            key: "value",
          });
          expect(request).toBeInstanceOf(Request);
          expect(request).toBeInstanceOf(FetchableRequest);
          expect(request).toHaveMethod(method.toUpperCase());
          expect(request).toHaveHeader("Content-Type", "application/json");
          await expect(request).toHaveJSONBody({ key: "value" });
        });
        it("should create a FetchableRequest with FormData body and default headers", async () => {
          const formData = new FormData();
          formData.append("key", "value");
          const request = FetchableRequest[method].formData("https://example.com/test", formData);
          expect(request).toBeInstanceOf(Request);
          expect(request).toBeInstanceOf(FetchableRequest);
          expect(request).toHaveMethod(method.toUpperCase());
          // coming soon
          // await expect(request).toHaveFormDataBody(formData);
          await expect(request.formData()).resolves.toBeInstanceOf(FormData);
        });
      },
    );
  });
});

describe("ProblemResponse", () => {
  it("should create a ProblemResponse with default status", async () => {
    const response = ProblemResponse.problem({
      ...f.outOfCreditProblem,
      type: f.outOfCreditType,
      status: undefined, // should default to 500
    });
    expect(response).toBeInstanceOf(Response);
    expect(response).toBeInstanceOf(ProblemResponse);
    expect(response).toHaveStatus(500);
    expect(response).toHaveHeader("Content-Type", "application/problem+json");
    await expect(response).toHaveJSONBody({
      ...f.outOfCreditProblem,
      type: f.outOfCreditType,
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
  describe("without construct function", () => {
    it("should create a ProblemDefinition with type and schema", () => {
      const problemDef = defineProblem(f.outOfCreditType, f.outOfCreditSchema);
      expect(problemDef).toHaveProperty("type", f.outOfCreditType);
      expect(problemDef).toHaveProperty("schema", f.outOfCreditSchema);
    });
  });

  describe("with construct function", () => {
    const problems = {
      OutOfCredit: defineProblem(
        f.outOfCreditType,
        f.outOfCreditSchema,
        (detail: string, instance: string, accounts: Array<string>) => ({
          title: "You do not have enough credit.",
          status: 403,
          detail,
          instance,
          accounts,
        }),
      ),
      IAmATeapot: defineProblem(f.iAmATeapotType, f.iAmATeapotSchema, () => [
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
        type: f.outOfCreditType,
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
        type: f.iAmATeapotType,
        title: "I'm a teapot",
        status: 418,
      });
    });
  });
});
