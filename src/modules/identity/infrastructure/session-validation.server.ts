import "server-only";
import type { SessionValidationPort } from "../application/ports/session-validation.server";
import type { SessionContext } from "../application/session-context";
import {
  AuthenticationError,
  type AuthenticationService,
} from "../application/authentication.server";

/** Bridge to the existing opaque SessionContext contract, minted only after DB validation. */
export function sessionValidator(
  auth: AuthenticationService,
): SessionValidationPort {
  return {
    async validate(evidence) {
      try {
        const session = await auth.authenticate(evidence.opaqueValue);
        const context = {
          sessionId: session.id,
          identity: {
            userId: session.user.id,
            status: "active",
            emailVerified: session.user.emailVerified,
          },
          authenticatedAt: session.createdAt,
          validatedAt: new Date(),
          expiresAt: session.expiresAt,
          assurance: session.mfaVerifiedAt
            ? { level: "mfa", verifiedAt: session.mfaVerifiedAt }
            : { level: "primary" },
        } as SessionContext;
        return { ok: true, value: context };
      } catch (error) {
        return {
          ok: false,
          error: {
            code:
              error instanceof AuthenticationError
                ? "unauthenticated"
                : "session_validation_unavailable",
          },
        };
      }
    },
  };
}
