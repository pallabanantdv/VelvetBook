import "server-only";
import type { Identifier } from "@/core/identifiers";
import type { Result } from "@/core/results";
import type {
  PlatformPermission,
  PlatformContext,
} from "@/modules/authorization/application/public";
import type { AdminAccessRequestDto } from "../dtos/contracts";
import type {
  AdminAuthorization,
  AdminOperationContext,
  PreparedAdminActionContext,
  SensitiveAdminContext,
  AdminFailure,
  PreparedAdminAuditReceipt,
} from "../contexts";

export interface AdminAccessVerificationPort {
  verify<P extends PlatformPermission>(input: {
    readonly platform: PlatformContext;
    readonly authorization: AdminAuthorization<P>;
    readonly request: AdminAccessRequestDto;
    readonly inputFingerprint: string;
  }): Promise<Result<AdminOperationContext<P>, AdminFailure>>;
}
export interface SensitiveAdminControlPort {
  verify<P extends PlatformPermission>(input: {
    readonly operation: AdminOperationContext<P>;
    readonly changeRequestId: Identifier<"AdminChangeRequest">;
    readonly approvalEvidenceRef: string;
    readonly idempotencyKey: string;
  }): Promise<Result<SensitiveAdminContext<P>, AdminFailure>>;
}

export interface AdminActionPreparationPort {
  prepare<P extends PlatformPermission>(input: {
    readonly operation: AdminOperationContext<P>;
    readonly changeRequestId: Identifier<"AdminChangeRequest">;
    readonly idempotencyKey: string;
  }): Promise<Result<PreparedAdminActionContext<P>, AdminFailure>>;
}
/** Consumer-owned audit intent port; no dependency back to audit-logs. */
export interface AdminAuditPreparationPort {
  prepare(input: {
    readonly context: AdminOperationContext;
    readonly changeRequestId: Identifier<"AdminChangeRequest">;
  }): Promise<Result<PreparedAdminAuditReceipt, AdminFailure>>;
}
