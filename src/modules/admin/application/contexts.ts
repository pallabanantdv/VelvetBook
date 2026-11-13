import type { Identifier, UserId } from "@/core/identifiers";
import type { ApplicationError } from "@/core/errors";
import type { SessionContext } from "@/modules/identity/application/public";
import type {
  PlatformPermission,
  PlatformContext,
  AuthorizedOperation,
  AuthorizationRequest,
} from "@/modules/authorization/application/public";
import type { AdminDataScope, AdminReasonCode } from "../domain/entities/model";

declare const verifiedScope: unique symbol;
declare const verifiedAdminOperation: unique symbol;
declare const independentApproval: unique symbol;
declare const preparedAudit: unique symbol;
declare const preparedAdminAction: unique symbol;
declare const sensitiveAdminOperation: unique symbol;

export type AdminFailure = ApplicationError<
  | "access_denied"
  | "invalid_input"
  | "invalid_state"
  | "conflict"
  | "unavailable"
  | "audit_unavailable"
>;
export type AdminAuthorization<
  P extends PlatformPermission = PlatformPermission,
> = AuthorizedOperation & {
  readonly request: Extract<AuthorizationRequest, { scope: "platform" }> & {
    readonly permission: P;
  };
};
export interface VerifiedAdminScope {
  readonly [verifiedScope]: true;
  readonly selection: AdminDataScope;
  readonly verifiedAt: Date;
  readonly inputFingerprint: string;
}
export interface AdminOperationContext<
  P extends PlatformPermission = PlatformPermission,
> {
  readonly [verifiedAdminOperation]: true;
  readonly platform: PlatformContext & {
    readonly session: SessionContext & {
      readonly assurance: { readonly level: "mfa"; readonly verifiedAt: Date };
    };
  };
  readonly authorization: AdminAuthorization<P>;
  readonly scope: VerifiedAdminScope;
  readonly reasonCode: AdminReasonCode;
  readonly justification: string;
  readonly ticketRef: string | null;
  readonly correlationId: string;
  readonly operationId: Identifier<"AdminOperation">;
  readonly inputFingerprint: string;
  readonly expiresAt: Date;
}
export interface IndependentApprovalReceipt {
  readonly [independentApproval]: true;
  readonly changeRequestId: Identifier<"AdminChangeRequest">;
  readonly requesterId: UserId;
  readonly approverId: UserId;
  readonly inputFingerprint: string;
  readonly approvedAt: Date;
  readonly expiresAt: Date;
}
export interface PreparedAdminAuditReceipt {
  readonly [preparedAudit]: true;
  readonly auditIntentId: Identifier<"AuditEvent">;
  readonly operationId: Identifier<"AdminOperation">;
  readonly inputFingerprint: string;
  readonly preparedAt: Date;
}
/** Recording a proposal/approval is audited and reauthenticated, but cannot apply it. */
export interface PreparedAdminActionContext<
  P extends PlatformPermission = PlatformPermission,
> extends AdminOperationContext<P> {
  readonly [preparedAdminAction]: true;
  readonly reauthenticatedAt: Date;
  readonly audit: PreparedAdminAuditReceipt;
  readonly idempotencyKey: string;
}

/** Future verifier must bind independent approval to exact operation, scope and input. */
export interface SensitiveAdminContext<
  P extends PlatformPermission = PlatformPermission,
> extends PreparedAdminActionContext<P> {
  readonly [sensitiveAdminOperation]: true;
  readonly approval: IndependentApprovalReceipt;
}
