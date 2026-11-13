import type { Identifier, OrganizationId, UserId } from "@/core/identifiers";

/** No wildcard/all-tenant selection. Platform scope cannot select tenant records. */
export type AdminDataScope =
  | { readonly kind: "organization"; readonly organizationId: OrganizationId }
  | {
      readonly kind: "organizations";
      readonly organizationIds: readonly [OrganizationId, ...OrganizationId[]];
    }
  | { readonly kind: "users"; readonly userIds: readonly [UserId, ...UserId[]] }
  | {
      readonly kind: "platform";
      readonly area: "settings" | "platform_audit" | "platform_activity";
    };

export type AdminReasonCode =
  | "onboarding_review"
  | "account_safety"
  | "content_policy"
  | "support_investigation"
  | "operational_reporting"
  | "configuration_change";

export interface AdminChangeRequest {
  readonly id: Identifier<"AdminChangeRequest">;
  readonly requesterId: UserId;
  readonly action: string;
  readonly resourceId: string;
  readonly inputFingerprint: string;
  readonly scope: AdminDataScope;
  readonly reasonCode: AdminReasonCode;
  readonly justification: string;
  readonly ticketRef: string | null;
  readonly expectedRevision: number;
  readonly state: "proposed" | "approved" | "rejected" | "applied" | "expired";
  readonly createdAt: Date;
  readonly expiresAt: Date;
}
