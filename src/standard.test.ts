import { expect, it, describe } from "vite-plus/test";

import { problemDetailsSchema } from "./standard.ts";

describe("problemDetailsSchema", () => {
  it("should validate a valid problem details object", () => {
    const validProblemDetails = {
      type: "https://example.com/probs/out-of-credit",
      title: "You do not have enough credit.",
      detail: "Your current balance is 30, but that costs 50.",
      instance: "/account/12345/msgs/abc",
      status: 403,
    };
    const result = problemDetailsSchema["~standard"].validate(validProblemDetails);
    expect(result).toEqual({ value: validProblemDetails });
  });

  it("should return issues for an invalid problem details object", () => {
    const invalidProblemDetails = {
      type: 123, // should be string
      title: "You do not have enough credit.",
      detail: "Your current balance is 30, but that costs 50.",
      instance: "/account/12345/msgs/abc",
      status: "403", // should be number
    };
    const result = problemDetailsSchema["~standard"].validate(invalidProblemDetails);
    expect(result).toHaveProperty(
      "issues",
      expect.arrayContaining([
        {
          message: 'Expected string for key "type", but got number.',
          path: ["type"],
        },
        {
          message: 'Expected number for key "status", but got string.',
          path: ["status"],
        },
      ]),
    );
  });
});
