import { expect, describe, it } from "vite-plus/test";

import { FetchableRequest } from "./request.ts";

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
    await expect(request).toHaveFormDataBody(formData);
  });

  it("should fetch the request and return a Response", async () => {
    const request = new FetchableRequest("https://example.com/test");
    const response = await request.fetch();
    expect(response).toBeInstanceOf(Response);
    expect(response).toHaveStatus(200);
    await expect(response).toHaveJSONBody({ message: "Hello, world!" });
  });

  it("should be thenable and return a Response", async () => {
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
          await expect(request).toHaveFormDataBody(formData);
        });
      },
    );
  });
});
