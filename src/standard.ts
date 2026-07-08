import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import type { LooseProblemDetails, LooseAutocomplete } from "./types.ts";

// #__NO_SIDE_EFFECTS__
function makeKeyIsType(issues: StandardSchemaV1.Issue[]) {
  return function keyIsType(
    obj: Record<string, unknown>,
    key: string,
    type: "string" | "number",
  ): void {
    // all keys are optional
    if (typeof obj[key] === "undefined" || typeof obj[key] === type) return;
    issues.push({
      message: `Expected ${type} for key "${key}", but got ${typeof obj[key]}.`,
      path: [key],
    });
  };
}

export const problemDetailsSchema: StandardSchemaV1<LooseProblemDetails> = {
  "~standard": {
    version: 1,
    vendor: "problem-request",
    validate(value) {
      const issues: StandardSchemaV1.Issue[] = [];
      const keyIsType = makeKeyIsType(issues);
      if (typeof value !== "object" || value === null) {
        return {
          issues: [
            {
              message: "Expected an object for ProblemDetails.",
            },
          ],
        };
      }
      const obj = value as Record<string, unknown>;
      keyIsType(obj, "status", "number");
      for (const key of ["type", "title", "detail", "instance"]) {
        keyIsType(obj, key, "string");
      }
      return issues.length ? { issues } : { value: value as LooseProblemDetails };
    },
  },
};

// #__NO_SIDE_EFFECTS__
export function safeParseSync<TSchema extends StandardSchemaV1<unknown>>(
  schema: TSchema,
  value: LooseAutocomplete.Unknown<StandardSchemaV1.InferInput<TSchema>>,
): StandardSchemaV1.Result<StandardSchemaV1.InferOutput<TSchema>> {
  const result = schema["~standard"].validate(value);
  if (result instanceof Promise) throw new TypeError("Only synchronous validation allowed.");
  return result;
}

// #__NO_SIDE_EFFECTS__
export async function safeParse<TSchema extends StandardSchemaV1<unknown>>(
  schema: TSchema,
  value: LooseAutocomplete.Unknown<StandardSchemaV1.InferInput<TSchema>>,
): Promise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<TSchema>>> {
  return schema["~standard"].validate(value);
}

// #__NO_SIDE_EFFECTS__
export function parseSync<TSchema extends StandardSchemaV1<unknown>>(
  schema: TSchema,
  value: LooseAutocomplete.Unknown<StandardSchemaV1.InferInput<TSchema>>,
): StandardSchemaV1.InferOutput<TSchema> {
  const result = safeParseSync(schema, value);
  if (result.issues) throw new SchemaError(result.issues);
  return result.value;
}

// #__NO_SIDE_EFFECTS__
export async function parse<TSchema extends StandardSchemaV1<unknown>>(
  schema: TSchema,
  value: LooseAutocomplete.Unknown<StandardSchemaV1.InferInput<TSchema>>,
): Promise<StandardSchemaV1.InferOutput<TSchema>> {
  const result = await schema["~standard"].validate(value);
  if (result.issues) throw new SchemaError(result.issues);
  return result.value;
}

// #__NO_SIDE_EFFECTS__
export function is<TSchema extends StandardSchemaV1<unknown>>(
  schema: TSchema,
  value: LooseAutocomplete.Unknown<StandardSchemaV1.InferInput<TSchema>>,
): value is StandardSchemaV1.InferOutput<TSchema> {
  return !safeParseSync(schema, value).issues;
}

export function assert<TSchema extends StandardSchemaV1<unknown>>(
  schema: TSchema,
  value: LooseAutocomplete.Unknown<StandardSchemaV1.InferInput<TSchema>>,
): asserts value is StandardSchemaV1.InferOutput<TSchema> {
  parseSync(schema, value);
}
