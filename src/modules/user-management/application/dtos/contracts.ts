export type UserManagementCommandDto =
  | {
      readonly action: "disable";
      readonly userId: string;
      readonly expectedRevision: number;
      readonly reasonCode: "abuse" | "account_compromise" | "policy_violation";
      readonly expiresAt: string | null;
    }
  | {
      readonly action: "restore" | "revoke_sessions" | "request_recovery";
      readonly userId: string;
      readonly expectedRevision: number;
    };
