import * as v from "valibot";
import { afterAll, afterEach, beforeAll, test as baseTest } from "vite-plus/test";

import { server } from "./mocks/server.ts";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export const test = baseTest.extend({ server });

export { test as it };

export const outOfCreditType = "https://example.com/probs/out-of-credit" as const;
export const outOfCreditSchema = v.object({
  title: v.literal("You do not have enough credit."),
  status: v.literal(403),
  detail: v.string(),
  instance: v.pipe(v.string(), v.toUpperCase()), // include a transform, to check it's used
  accounts: v.array(v.string()),
});
export type OutOfCreditProblem = v.InferInput<typeof outOfCreditSchema>;
export const outOfCreditProblem = {
  title: "You do not have enough credit.",
  status: 403,
  detail: "Your account balance is insufficient.",
  instance: "/account/12345/transactions",
  accounts: ["account1", "account2"],
} satisfies OutOfCreditProblem;

export const iAmATeapotType = "https://example.com/probs/i-am-a-teapot" as const;
export const iAmATeapotSchema = v.object({
  title: v.literal("I'm a teapot"),
  status: v.literal(418),
});
export type IAmATeapotProblem = v.InferInput<typeof iAmATeapotSchema>;
