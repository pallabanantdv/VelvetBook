import "server-only";

import type { Result } from "@/core/results";
import type { SessionContext } from "../session-context";

export interface SessionValidationFailure {
  readonly code: "unauthenticated" | "session_validation_unavailable";
}

/** Opaque untrusted evidence, not decoded client claims. No issuance contract yet. */
export interface SessionValidationPort {
  validate(evidence: {
    readonly opaqueValue: string;
  }): Promise<Result<SessionContext, SessionValidationFailure>>;
}
