import "server-only";
import type { z } from "zod";
import type { InputValidationError, ValidationIssueCode } from "@/core/errors";
import type { Result } from "@/core/results";

/** publicFields contains trusted schema labels, never labels supplied by the caller. */
export function validateInput<Output>(
  schema: z.ZodType<Output>,
  input: unknown,
  publicFields: readonly string[] = [],
): Result<Output, InputValidationError> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    error: {
      kind: "application",
      category: "validation",
      code: "invalid_input",
      message: "Input validation failed.",
      issues: parsed.error.issues.slice(0, 50).map((issue) => {
        const label = issue.path
          .map((part) => (typeof part === "number" ? "*" : String(part)))
          .join(".");
        const code: ValidationIssueCode =
          issue.code === "invalid_type"
            ? "invalid_type"
            : issue.code === "too_small" || issue.code === "too_big"
              ? "out_of_range"
              : issue.code === "unrecognized_keys"
                ? "unknown_field"
                : "invalid_format";
        return { field: publicFields.includes(label) ? label : null, code };
      }),
    },
  };
}
