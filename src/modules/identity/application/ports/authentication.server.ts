import "server-only";

import type { Result } from "@/core/results";
import type { UserIdentity } from "../../domain/identity";

/** Secret-bearing evidence: never log, persist casually, or expose through client props. */
export type AuthenticationEvidence =
  | {
      readonly kind: "password";
      readonly identifier: string;
      readonly password: string;
    }
  | {
      readonly kind: "federated";
      readonly providerId: string;
      readonly authorizationCode: string;
      readonly redirectUri: string;
      readonly codeVerifier: string;
    };

export interface AuthenticationFailure {
  readonly code: "invalid_credentials" | "authentication_unavailable";
}

/** Validates provider evidence and resolves a local active identity; issues no session. */
export interface AuthenticationProviderPort {
  authenticate(evidence: AuthenticationEvidence): Promise<
    Result<
      {
        readonly identity: UserIdentity & { readonly status: "active" };
        readonly authenticatedAt: Date;
      },
      AuthenticationFailure
    >
  >;
}
