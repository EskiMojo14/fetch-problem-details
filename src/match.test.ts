import { describe, expect, it } from "vite-plus/test";
import { matchProblem } from "./match.ts";
import { defineProblem, ProblemResponse } from "./index.ts";
import type { LooseProblemDetails } from "./types.ts";
import * as v from "valibot";

const problems = {
  OutOfCredit: defineProblem(
    "https://example.com/probs/out-of-credit",
    v.object({
      type: v.literal("https://example.com/probs/out-of-credit"),
      title: v.literal("You do not have enough credit."),
      status: v.literal(403),
      detail: v.string(),
      instance: v.pipe(v.string(), v.toUpperCase()),
      accounts: v.array(v.string()),
    }),
    (detail: string, instance: string, accounts: string[]) => ({
      title: "You do not have enough credit.",
      status: 403,
      detail,
      instance,
      accounts,
    }),
  ),
  IAmATeapot: defineProblem(
    "https://example.com/probs/i-am-a-teapot",
    v.object({
      type: v.literal("https://example.com/probs/i-am-a-teapot"),
      title: v.literal("I'm a teapot."),
      status: v.literal(418),
      detail: v.string(),
      instance: v.string(),
    }),
    (detail: string, instance: string) => ({
      title: "I'm a teapot.",
      status: 418,
      detail,
      instance,
    }),
  ),
};

describe("matchProblem", async () => {
  it("should match a known problem", async () => {
    const response = problems.OutOfCredit("Insufficient funds", "instance-123", [
      "account1",
      "account2",
    ]);
    const matchResult = await matchProblem(response, problems);
    expect(matchResult.matched).toBe(true);
    expect(matchResult.isProblem).toBe(true);
    expect(matchResult.type).toBe(problems.OutOfCredit.type);
    expect(matchResult.problem).toEqual({
      type: "https://example.com/probs/out-of-credit",
      title: "You do not have enough credit.",
      status: 403,
      detail: "Insufficient funds",
      instance: "INSTANCE-123",
      accounts: ["account1", "account2"],
    });
  });

  it("should allow an array of known problems", async () => {
    const response = problems.IAmATeapot("Short and stout", "instance-456");
    const matchResult = await matchProblem(response, [problems.OutOfCredit, problems.IAmATeapot]);
    expect(matchResult.matched).toBe(true);
    expect(matchResult.isProblem).toBe(true);
    expect(matchResult.type).toBe(problems.IAmATeapot.type);
    expect(matchResult.problem).toEqual({
      type: "https://example.com/probs/i-am-a-teapot",
      title: "I'm a teapot.",
      status: 418,
      detail: "Short and stout",
      instance: "instance-456",
    });
  });

  it("should not match an unknown problem", async () => {
    const problem: LooseProblemDetails = {
      type: "https://example.com/probs/unknown-problem",
      title: "Unknown problem",
      status: 400,
      detail: "This is an unknown problem.",
      instance: "instance-456",
    };
    const matchResult = await matchProblem(ProblemResponse.problem(problem), problems);
    expect(matchResult.matched).toBe(false);
    expect(matchResult.isProblem).toBe(true);
    expect(matchResult.problem).toEqual(problem);
  });

  describe("failures", () => {
    describe("content type", () => {
      it("should fail if content type is not application/problem+json", async () => {
        const response = new Response(JSON.stringify({}), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
        const matchResult = await matchProblem(response, problems);
        expect(matchResult.matched).toBe(false);
        expect(matchResult.reason?.contentType).toBe("application/json");
      });

      it("should not fail if content type is not application/problem+json but requireContentType is false", async () => {
        const response = new Response(JSON.stringify({}), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
        const matchResult = await matchProblem(response, problems, {
          requireContentType: false,
        });
        expect(matchResult.matched).toBe(false);
        expect(matchResult.reason?.contentType).toBeUndefined();
      });
    });
    describe("status code", () => {
      it("should fail if status code is not an error and requireErrorStatus is true", async () => {
        const response = new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/problem+json" },
        });
        const matchResult = await matchProblem(response, problems);
        expect(matchResult.matched).toBe(false);
        expect(matchResult.reason?.status).toBe(200);
      });

      it("should not fail if status code is not an error but requireErrorStatus is false", async () => {
        const response = new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/problem+json" },
        });
        const matchResult = await matchProblem(response, problems, {
          requireErrorStatus: false,
        });
        expect(matchResult.matched).toBe(false);
        expect(matchResult.reason?.status).toBeUndefined();
      });
    });
    it("should fail if response body is not valid JSON", async () => {
      const response = new Response("not-json", {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
      const matchResult = await matchProblem(response, problems);
      expect(matchResult.matched).toBe(false);
      expect(matchResult.reason?.jsonError).toBeInstanceOf(SyntaxError);
    });
  });
});
