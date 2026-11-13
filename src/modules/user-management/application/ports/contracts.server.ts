import "server-only";
import type { Result } from "@/core/results";
import type {
  AdminFailure,
  AdminOperationContext,
  SensitiveAdminContext,
} from "@/modules/admin/application/public";
import type {
  ManagedUserAccount,
  AccountManagementAction,
} from "../../domain/entities/model";
import type { UserManagementCommandDto } from "../dtos/contracts";

/** Proposed contracts only; exact permission, scope and fingerprint must match on use. */
export type UserAccountReadContext = AdminOperationContext<{
  readonly scope: "platform";
  readonly resource: "user";
  readonly action: "read";
}>;
export type UserAccountMutationContext = SensitiveAdminContext<{
  readonly scope: "platform";
  readonly resource: "user";
  readonly action: AccountManagementAction;
}>;
export interface ManagedUserRepository {
  inspect(input: {
    readonly context: UserAccountReadContext;
    readonly userId: ManagedUserAccount["userId"];
  }): Promise<Result<ManagedUserAccount | null, AdminFailure>>;
}
export interface UserManagementPort {
  execute(input: {
    readonly context: UserAccountMutationContext;
    readonly command: UserManagementCommandDto;
  }): Promise<
    Result<
      {
        readonly userId: ManagedUserAccount["userId"];
        readonly state: "planned" | "completed";
        readonly resultingRevision: number;
      },
      AdminFailure
    >
  >;
}
export interface PrivilegedAccountSafetyPort {
  assess(input: {
    readonly context: UserAccountMutationContext;
    readonly target: ManagedUserAccount;
  }): Promise<
    Result<
      {
        readonly eligible: boolean;
        readonly restrictions: readonly (
          | "self_action"
          | "privileged_target"
          | "last_admin"
          | "active_investigation"
        )[];
      },
      AdminFailure
    >
  >;
}
