import { describe, expect, it } from "vite-plus/test";

import * as _f from "../tests/__fixtures.ts";
import { defineProblem, ProblemResponse } from "./index.ts";
import { matchProblem } from "./match.ts";
import type { LooseProblemDetails } from "./types.ts";

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
  IAmATeapot: defineProblem(_f.iAmATeapotType, _f.iAmATeapotSchema, () => ({
    title: "I'm a teapot",
    status: 418,
  })),
};

describe("matchProblem", async () => {
  it("should match a known problem", async () => {
    const response = problems.OutOfCredit(
      _f.outOfCreditProblem.detail,
      _f.outOfCreditProblem.instance,
      _f.outOfCreditProblem.accounts,
    );
    const matchResult = await matchProblem(response, problems);
    expect(matchResult.matched).toBe(true);
    expect(matchResult.isProblem).toBe(true);
    expect(matchResult.type).toBe(problems.OutOfCredit.type);
    expect(matchResult.problem).toEqual({
      ..._f.outOfCreditProblem,
      instance: _f.outOfCreditProblem.instance.toUpperCase(), // check that the transform was applied
      type: _f.outofCreditType,
    });
  });

  it("should allow an array of known problems", async () => {
    const response = problems.IAmATeapot();
    const matchResult = await matchProblem(response, [problems.OutOfCredit, problems.IAmATeapot]);
    expect(matchResult.matched).toBe(true);
    expect(matchResult.isProblem).toBe(true);
    expect(matchResult.type).toBe(problems.IAmATeapot.type);
    expect(matchResult.problem).toEqual({
      type: _f.iAmATeapotType,
      title: "I'm a teapot",
      status: 418,
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
