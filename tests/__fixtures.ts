import * as v from "valibot";

export const outofCreditType = "https://example.com/probs/out-of-credit" as const;
export const outofCreditSchema = v.object({
  title: v.literal("You do not have enough credit."),
  status: v.literal(403),
  detail: v.string(),
  instance: v.pipe(v.string(), v.toUpperCase()), // include a transform, to check it's used
  accounts: v.array(v.string()),
});
export type OutOfCreditProblem = v.InferInput<typeof outofCreditSchema>;
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
