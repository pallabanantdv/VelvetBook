import "server-only";

import type { Identifier, UserId } from "@/core/identifiers";
import type { Result } from "@/core/results";
import type { SessionContext } from "../session-context";

export type MfaChallengeId = Identifier<"MfaChallenge">;
export type MfaMethod = "totp" | "webauthn" | "recovery_code";
export interface MfaFailure {
  readonly code: "invalid_challenge" | "mfa_unavailable" | "unsupported_method";
}

/** Future step-up only; enrollment, recovery, secret storage, and session renewal are deferred. */
export interface MfaPort {
  beginChallenge(input: {
    readonly session: SessionContext;
    readonly method: MfaMethod;
  }): Promise<
    Result<
      {
        readonly challengeId: MfaChallengeId;
        readonly expiresAt: Date;
      },
      MfaFailure
    >
  >;
  verifyChallenge(input: {
    readonly session: SessionContext;
    readonly challengeId: MfaChallengeId;
    readonly opaqueResponse: string;
  }): Promise<
    Result<
      {
        readonly subjectId: UserId;
        readonly challengeId: MfaChallengeId;
        readonly verifiedAt: Date;
      },
      MfaFailure
    >
  >;
}
