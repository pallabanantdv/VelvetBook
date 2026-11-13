import type {
  Identifier,
  OrganizationId,
  StoreId,
  UserId,
} from "@/core/identifiers";
export type ModerationTarget =
  | {
      readonly kind: "business_listing";
      readonly organizationId: OrganizationId;
      readonly storeId: StoreId;
    }
  | {
      readonly kind: "review";
      readonly organizationId: OrganizationId;
      readonly storeId: StoreId;
      readonly reviewId: Identifier<"Review">;
    }
  | {
      readonly kind: "reported_content";
      readonly organizationId: OrganizationId;
      readonly reportId: Identifier<"ContentReport">;
      readonly contentKind: "message" | "business_photo";
      readonly contentId: string;
    };
export interface ModerationCase {
  readonly id: Identifier<"ModerationCase">;
  readonly target: ModerationTarget;
  readonly state: "open" | "in_review" | "resolved" | "escalated";
  readonly evidenceRef: string;
  readonly evidenceRevision: number;
  readonly policyVersion: string;
  readonly assignedModeratorId: UserId | null;
  readonly revision: number;
  readonly createdAt: Date;
}
export interface ModerationDecision {
  readonly caseId: Identifier<"ModerationCase">;
  readonly disposition: "allow" | "restrict" | "reject" | "escalate";
  readonly policyVersion: string;
  readonly reasonCode: string;
  readonly moderatorId: UserId;
  readonly decidedAt: Date;
}
export interface ContentReport {
  readonly id: Identifier<"ContentReport">;
  readonly organizationId: OrganizationId;
  readonly target: ModerationTarget;
  readonly reporterUserId: UserId | null;
  readonly category:
    "spam" | "harassment" | "fraud" | "inappropriate_content" | "other";
  readonly createdAt: Date;
}
