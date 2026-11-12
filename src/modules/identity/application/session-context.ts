import type { SessionId } from "@/core/identifiers";
import type { UserIdentity } from "../domain/identity";

declare const validatedSession: unique symbol;

/** Produced only by a future trusted validator; no token/cookie or cached role list. */
export interface SessionContext {
  readonly [validatedSession]: true;
  readonly sessionId: SessionId;
  readonly identity: UserIdentity & { readonly status: "active" };
  readonly authenticatedAt: Date;
  readonly validatedAt: Date;
  readonly expiresAt: Date;
  readonly assurance:
    | { readonly level: "primary" }
    | { readonly level: "mfa"; readonly verifiedAt: Date };
}
