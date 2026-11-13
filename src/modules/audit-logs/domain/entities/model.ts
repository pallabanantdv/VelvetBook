import type {
  Identifier,
  OrganizationId,
  UserId,
  SessionId,
} from "@/core/identifiers";
export type AuditActor =
  | {
      readonly kind: "user";
      readonly userId: UserId;
      readonly sessionId: SessionId;
    }
  | {
      readonly kind: "system";
      readonly service: string;
      readonly jobId: string;
    }
  | {
      readonly kind: "integration";
      readonly providerNamespace: string;
      readonly eventRef: string;
    }
  | { readonly kind: "anonymous"; readonly sourceFingerprint: string };
export type AuditAction =
  | "admin.access"
  | "organization.review"
  | "organization.suspend"
  | "organization.restore"
  | "user.disable"
  | "user.restore"
  | "user.revoke_sessions"
  | "user.request_recovery"
  | "moderation.decide"
  | "report.read"
  | "report.export"
  | "setting.propose"
  | "setting.approve"
  | "setting.apply"
  | "audit.read"
  | "audit.export"
  | "security.access_denied";
export interface AuditMetadata {
  readonly reasonCode?: string;
  readonly ticketRef?: string;
  readonly changeRequestId?: string;
  readonly expectedRevision?: number;
  readonly resultingRevision?: number;
  readonly resultCode?: string;
  readonly changedFields?: readonly string[];
  readonly scopeFingerprint?: string;
  readonly affectedTenantCount?: number;
}
export interface AuditEvent {
  readonly id: Identifier<"AuditEvent">;
  readonly schemaVersion: 1;
  readonly actor: AuditActor;
  readonly action: AuditAction;
  readonly resource: {
    readonly kind:
      | "admin"
      | "organization"
      | "onboarding"
      | "user"
      | "moderation"
      | "report"
      | "platform_setting"
      | "audit";
    readonly id: string | null;
  };
  readonly tenant: OrganizationId | null;
  readonly timestamp: Date;
  readonly recordedAt: Date;
  readonly operationId: string;
  readonly correlationId: string;
  readonly inputFingerprint: string;
  readonly outcome: "attempted" | "allowed" | "denied" | "succeeded" | "failed";
  readonly metadata: AuditMetadata;
}
declare const trustedAuditWriter: unique symbol;
export interface AuditWriteContext {
  readonly [trustedAuditWriter]: true;
  readonly source: "admin" | "security" | "integration";
  readonly actor: AuditActor;
  readonly operationId: string;
}
