import type { Identifier, OrganizationId, UserId } from "@/core/identifiers";
/** Projection of onboarding review, not a second onboarding state machine. */
export interface OrganizationApprovalCase {
  readonly id: Identifier<"OrganizationApprovalCase">;
  readonly organizationId: OrganizationId;
  readonly onboardingId: Identifier<"Onboarding">;
  readonly submissionRevision: number;
  readonly submittedByUserId: UserId;
  readonly state: "queued" | "in_review" | "approved" | "rejected";
  readonly assignedReviewerId: UserId | null;
  readonly evidenceSnapshotRef: string;
  readonly revision: number;
  readonly submittedAt: Date;
}
export interface ApprovalDecisionRecord {
  readonly caseId: Identifier<"OrganizationApprovalCase">;
  readonly decision: "approved" | "rejected";
  readonly reviewerId: UserId;
  readonly reason: string;
  readonly submissionRevision: number;
  readonly decidedAt: Date;
}
