import { expect, it, describe } from "vite-plus/test";
import { ProblemResponse, type LooseProblemDetails, defineProblems } from "./index.ts";
import * as v from "valibot";
import { SchemaError } from "@standard-schema/utils";

const problemDetails: LooseProblemDetails = {
  type: "https://example.com/probs/out-of-credit",
  title: "You do not have enough credit.",
  status: 403,
  detail: "Your current balance is 30, but that costs 50.",
  instance: "/account/12345/msgs/abc",
  accounts: ["/account/12345", "/account/67890"],
};

describe("ProblemResponse", () => {
  it("should create a ProblemResponse with default status", async () => {
    const response = ProblemResponse.problem({
      ...problemDetails,
      status: undefined, // should default to 500
    });
    expect(response).toBeInstanceOf(Response);
    expect(response).toBeInstanceOf(ProblemResponse);
    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    await expect(response.json()).resolves.toEqual({
      ...problemDetails,
      status: undefined,
    });
  });
  it("should create a ProblemResponse with custom status", () => {
    const response = ProblemResponse.problem({
      ...problemDetails,
      status: 403,
    });
    expect(response.status).toBe(403);
  });
  it("respects custom headers and does not override Content-Type if provided", () => {
    const customHeaders = new Headers({
      "X-Custom-Header": "CustomValue",
      "Content-Type": "application/json",
    });
    const response = ProblemResponse.problem(problemDetails, {
      headers: customHeaders,
    });
    expect(response.headers.get("X-Custom-Header")).toBe("CustomValue");
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("defineProblems", () => {
  const problems = defineProblems({
    OutOfCredit: {
      schema: v.object({
        type: v.literal("https://example.com/probs/out-of-credit"),
        title: v.literal("You do not have enough credit."),
        status: v.literal(403),
        detail: v.string(),
        instance: v.pipe(v.string(), v.toUpperCase()),
        accounts: v.array(v.string()),
      }),
      construct(detail: string, instance: string, accounts: string[]) {
        return {
          type: "https://example.com/probs/out-of-credit",
          title: "You do not have enough credit.",
          status: 403,
          detail,
          instance,
          accounts,
        } as const;
      },
    },
    CustomInitProblem: {
      schema: v.object({
        type: v.literal("https://example.com/probs/custom-init"),
        title: v.literal("Custom Init Problem"),
      }),
      construct() {
        return [
          {
            type: "https://example.com/probs/custom-init",
            title: "Custom Init Problem",
          } as const,
          {
            headers: {
              "X-Custom-Header": "CustomValue",
            },
          },
        ];
      },
    },
  });

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
    const problem = problems.CustomInitProblem();
    expect(problem).toBeInstanceOf(Response);
    expect(problem).toBeInstanceOf(ProblemResponse);
    expect(problem.status).toBe(500);
    expect(problem.headers.get("X-Custom-Header")).toBe("CustomValue");
    await expect(problem.json()).resolves.toEqual({
      type: "https://example.com/probs/custom-init",
      title: "Custom Init Problem",
    });
  });
  describe("problem.parse", () => {
    it("should parse a valid problem details object", () => {
      const parsed = problems.OutOfCredit.parse(problemDetails);
      expect(parsed).toEqual({
        ...problemDetails,
        instance: "/ACCOUNT/12345/MSGS/ABC", // transformed to uppercase
      });
    });
    it("should throw an error for an invalid problem details object", () => {
      expect(() =>
        problems.OutOfCredit.parse({
          ...problemDetails,
          status: 404, // invalid status
        }),
      ).toThrow(SchemaError);
    });
  });
  describe("problem.safeParse", () => {
    it("should safely parse a valid problem details object", () => {
      const result = problems.OutOfCredit.safeParse(problemDetails);
      expect(result).toEqual({
        value: {
          ...problemDetails,
          instance: "/ACCOUNT/12345/MSGS/ABC", // transformed to uppercase
        },
      });
    });
    it("should return issues for an invalid problem details object", () => {
      const result = problems.OutOfCredit.safeParse({
        ...problemDetails,
        status: 404, // invalid status
      });
      expect(result.issues).toBeDefined();
      expect(result.issues?.length).toBeGreaterThan(0);
    });
  });
});
