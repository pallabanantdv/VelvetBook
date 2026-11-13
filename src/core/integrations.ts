import type { Identifier, OrganizationId, UserId } from "./identifiers";

declare const trustedIntegrationCall: unique symbol;
/** Future server orchestration creates this only after operation-specific authorization. */
export interface IntegrationCallContext {
  readonly [trustedIntegrationCall]: true;
  readonly operationId: Identifier<"IntegrationOperation">;
  readonly correlationId: string;
  readonly organizationId: OrganizationId | null;
  readonly actor:
    | { readonly kind: "user"; readonly userId: UserId }
    | { readonly kind: "system"; readonly name: string };
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly deadlineAt: Date;
  readonly attempt: number;
}

/** Sanitized failure data; never a raw SDK error, secret, response body, or PII. */
export interface IntegrationFailure {
  readonly category:
    | "timeout"
    | "transient"
    | "rate_limited"
    | "permanent"
    | "unavailable"
    | "invalid_response"
    | "unknown_outcome";
  readonly code: string;
  readonly retryAfterSeconds: number | null;
  readonly providerReference: string | null;
}
