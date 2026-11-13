import type { Identifier, UserId } from "@/core/identifiers";
export interface ManagedUserAccount {
  readonly userId: UserId;
  readonly status: "active" | "suspended";
  readonly platformPrivileged: boolean;
  readonly authorizationVersion: number;
  readonly revision: number;
}
export interface UserSuspension {
  readonly id: Identifier<"UserSuspension">;
  readonly userId: UserId;
  readonly requestedBy: UserId;
  readonly reasonCode: "abuse" | "account_compromise" | "policy_violation";
  readonly reason: string;
  readonly startsAt: Date;
  readonly expiresAt: Date | null;
  readonly liftedAt: Date | null;
}
export type AccountManagementAction =
  "disable" | "restore" | "revoke_sessions" | "request_recovery";
