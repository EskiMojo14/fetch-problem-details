import type { StandardSchemaV1 } from "@standard-schema/spec";
import { expect, describe, it } from "vite-plus/test";

import {
  problemDetailsSchema,
  safeParse,
  safeParseSync,
  parse,
  parseSync,
  is,
  assert,
} from "./standard.ts";

const validProblemDetails = {
  type: "https://example.com/probs/out-of-credit",
  title: "You do not have enough credit.",
  detail: "Your current balance is 30, but that costs 50.",
  instance: "/account/12345/msgs/abc",
  status: 403,
};
const invalidProblemDetails = {
  type: 123, // should be string
  title: "You do not have enough credit.",
  detail: "Your current balance is 30, but that costs 50.",
  instance: "/account/12345/msgs/abc",
  status: "403", // should be number
};

const asyncSchema: StandardSchemaV1 = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: async (value) => ({ value }),
  },
};

describe("problemDetailsSchema", () => {
  it("should validate a valid problem details object", () => {
    const result = problemDetailsSchema["~standard"].validate(validProblemDetails);
    expect(result).toEqual({ value: validProblemDetails });
  });

  it("should return issues for an invalid problem details object", () => {
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

describe("safeParse", () => {
  it("should parse a valid problem details object", async () => {
    await expect(safeParse(problemDetailsSchema, validProblemDetails)).resolves.toEqual({
      value: validProblemDetails,
    });
  });

  it("should return issues for an invalid problem details object", async () => {
    await expect(safeParse(problemDetailsSchema, invalidProblemDetails)).resolves.toHaveProperty(
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

describe("safeParseSync", () => {
  it("should parse a valid problem details object", () => {
    const result = safeParseSync(problemDetailsSchema, validProblemDetails);
    expect(result).toEqual({ value: validProblemDetails });
  });

  it("should return issues for an invalid problem details object", () => {
    const result = safeParseSync(problemDetailsSchema, invalidProblemDetails);
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

  it("should throw an error when using async schema", () => {
    expect(() =>
      safeParseSync(asyncSchema, validProblemDetails),
    ).toThrowErrorMatchingInlineSnapshot(`[TypeError: Only synchronous validation allowed.]`);
  });
});

describe("parse", () => {
  it("should parse a valid problem details object", async () => {
    await expect(parse(problemDetailsSchema, validProblemDetails)).resolves.toEqual(
      validProblemDetails,
    );
  });

  it("should throw an error for an invalid problem details object", async () => {
    await expect(
      parse(problemDetailsSchema, invalidProblemDetails),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[SchemaError: Expected number for key "status", but got string.]`,
    );
  });
});

describe("parseSync", () => {
  it("should parse a valid problem details object", () => {
    const result = parseSync(problemDetailsSchema, validProblemDetails);
    expect(result).toEqual(validProblemDetails);
  });

  it("should throw an error for an invalid problem details object", () => {
    expect(() =>
      parseSync(problemDetailsSchema, invalidProblemDetails),
    ).toThrowErrorMatchingInlineSnapshot(
      `[SchemaError: Expected number for key "status", but got string.]`,
    );
  });

  it("should throw an error when using async schema", () => {
    expect(() => parseSync(asyncSchema, validProblemDetails)).toThrowErrorMatchingInlineSnapshot(
      `[TypeError: Only synchronous validation allowed.]`,
    );
  });
});

describe("is", () => {
  it("should return true for a valid problem details object", () => {
    const result = is(problemDetailsSchema, validProblemDetails);
    expect(result).toBe(true);
  });

  it("should return false for an invalid problem details object", () => {
    const result = is(problemDetailsSchema, invalidProblemDetails);
    expect(result).toBe(false);
  });

  it("should throw an error when using async schema", () => {
    expect(() => is(asyncSchema, validProblemDetails)).toThrowErrorMatchingInlineSnapshot(
      `[TypeError: Only synchronous validation allowed.]`,
    );
  });
});

describe("assert", () => {
  it("should not throw for a valid problem details object", () => {
    expect(() => assert(problemDetailsSchema, validProblemDetails)).not.toThrow();
  });

  it("should throw an error for an invalid problem details object", () => {
    expect(() =>
      assert(problemDetailsSchema, invalidProblemDetails),
    ).toThrowErrorMatchingInlineSnapshot(
      `[SchemaError: Expected number for key "status", but got string.]`,
    );
  });

  it("should throw an error when using async schema", () => {
    expect(() => assert(asyncSchema, validProblemDetails)).toThrowErrorMatchingInlineSnapshot(
      `[TypeError: Only synchronous validation allowed.]`,
    );
  });
});
