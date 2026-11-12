import type {
  OnboardingState,
  OnboardingSection,
  SectionProgress,
} from "../../domain/entities/model";
/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface OnboardingDraftDto {
  readonly selectedStoreIds: readonly string[];
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface OnboardingViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: OnboardingDraftDto;
  readonly state: OnboardingState;
  readonly sectionProgress: Readonly<
    Record<OnboardingSection, SectionProgress>
  >;
  readonly submittedAt: string | null;
}
