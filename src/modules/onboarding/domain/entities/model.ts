import type {
  Identifier,
  OrganizationId,
  StoreId,
  UserId,
} from "@/core/identifiers";

export type OnboardingSection =
  | "organization"
  | "photos"
  | "services"
  | "products"
  | "staff"
  | "visibility"
  | "review";
export type OnboardingState =
  "draft" | "submitted" | "under_review" | "approved" | "rejected";
export type SectionProgress =
  "not_started" | "in_progress" | "complete" | "not_applicable";
/** Proposed entity shape; no constructors or invariant handlers yet. */
interface OnboardingBase {
  readonly id: Identifier<"Onboarding">;
  readonly organizationId: OrganizationId;
  readonly selectedStoreIds: readonly StoreId[];
  readonly sectionProgress: Readonly<
    Record<OnboardingSection, SectionProgress>
  >;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type Onboarding = OnboardingBase &
  (
    | {
        readonly state: "draft";
        readonly submittedAt: null;
        readonly submittedByUserId: null;
        readonly review: null;
      }
    | {
        readonly state: "submitted" | "under_review";
        readonly submittedAt: Date;
        readonly submittedByUserId: UserId;
        readonly review: null;
      }
    | {
        readonly state: "approved";
        readonly submittedAt: Date;
        readonly submittedByUserId: UserId;
        readonly review: {
          readonly decision: "approved";
          readonly reviewerId: UserId;
          readonly decidedAt: Date;
          readonly reason: null;
        };
      }
    | {
        readonly state: "rejected";
        readonly submittedAt: Date;
        readonly submittedByUserId: UserId;
        readonly review: {
          readonly decision: "rejected";
          readonly reviewerId: UserId;
          readonly decidedAt: Date;
          readonly reason: string;
        };
      }
  );
