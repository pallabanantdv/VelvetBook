import "server-only";
import type {
  ApplicationErrorCategory,
  ClassifiedApplicationError,
} from "@/core/errors";
import type {
  ApiFailure,
  PublicErrorCode,
  ResponseMetadata,
} from "./api-contracts";

const mapping = {
  validation: [400, "VALIDATION_FAILED", "Input validation failed."],
  unauthenticated: [401, "UNAUTHENTICATED", "Authentication is required."],
  forbidden: [403, "ACCESS_DENIED", "Access is denied."],
  not_found: [404, "NOT_FOUND", "The requested resource was not found."],
  conflict: [
    409,
    "CONFLICT",
    "The operation conflicts with the current state.",
  ],
  rate_limited: [429, "RATE_LIMITED", "Please try again later."],
  unavailable: [
    503,
    "UNAVAILABLE",
    "The operation is temporarily unavailable.",
  ],
  internal: [500, "INTERNAL_ERROR", "An unexpected error occurred."],
} as const satisfies Record<
  ApplicationErrorCategory,
  readonly [number, PublicErrorCode, string]
>;

export interface MappedErrorResponse {
  readonly status: number;
  readonly body: ApiFailure;
}
/** Accept only server-classified errors. Never serialize internal messages or causes. */
export function mapApplicationError(
  error: ClassifiedApplicationError,
  meta: ResponseMetadata,
): MappedErrorResponse {
  const [status, code, message] = mapping[error.category];
  const issues =
    error.category === "validation" && error.issues
      ? error.issues.slice(0, 50).map(({ field, code }) => ({ field, code }))
      : undefined;
  return {
    status,
    body: {
      ok: false,
      error: { code, message, ...(issues ? { issues } : {}) },
      meta: { requestId: meta.requestId, correlationId: meta.correlationId },
    },
  };
}
export function mapUnexpectedError(
  meta: ResponseMetadata,
): MappedErrorResponse {
  return mapApplicationError(
    {
      kind: "application",
      category: "internal",
      code: "unexpected",
      message: "Unexpected failure",
    },
    meta,
  );
}
