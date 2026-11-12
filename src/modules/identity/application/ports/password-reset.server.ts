import "server-only";

import type { Result } from "@/core/results";

export interface PasswordResetPort {
  /** Same successful response for existing and unknown accounts; no token returned. */
  request(input: { readonly identifier: string }): Promise<
    Result<
      void,
      {
        readonly code: "password_reset_unavailable";
      }
    >
  >;
  /** Future implementation must consume proof once and revoke affected sessions. */
  complete(input: {
    readonly opaqueProof: string;
    readonly newPassword: string;
  }): Promise<
    Result<
      void,
      {
        readonly code:
          | "invalid_reset_proof"
          | "password_rejected"
          | "password_reset_unavailable";
      }
    >
  >;
}
