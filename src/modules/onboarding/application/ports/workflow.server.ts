import "server-only";

import type { Identifier, OrganizationId, StoreId } from "@/core/identifiers";
import type { ApplicationError } from "@/core/errors";
import type { Result } from "@/core/results";
import type {
  AuthorizedOperation,
  AuthorizationRequest,
  OrganizationOperationContext,
  PlatformContext,
  ResourceOwnership,
} from "@/modules/authorization/application/public";
import type {
  OnboardingSection,
  SectionProgress,
} from "../../domain/entities/model";
import type { OnboardingViewDto } from "../dtos/contracts";
import type {
  OnboardingSectionEnvelopeDto,
  OnboardingSectionSubmissionDto,
  OnboardingReviewDecisionDto,
} from "../dtos/sections";

export type OnboardingFailure = ApplicationError<
  | "invalid_input"
  | "invalid_state"
  | "incomplete"
  | "access_denied"
  | "conflict"
  | "unavailable"
>;

/** Consumer-owned inspection port; no cyclic runtime dependency on feature modules. */
export interface OnboardingReadinessPort {
  inspect(input: {
    readonly context: OrganizationOperationContext;
    readonly storeIds: readonly StoreId[];
  }): Promise<
    Result<
      Readonly<
        Record<
          OnboardingSection,
          {
            readonly progress: SectionProgress;
            readonly issues: readonly string[];
          }
        >
      >,
      OnboardingFailure
    >
  >;
}

export interface OnboardingSectionValidationPort {
  validate(input: {
    readonly context: OrganizationOperationContext;
    readonly envelope: OnboardingSectionEnvelopeDto;
  }): Promise<Result<OnboardingSectionSubmissionDto, OnboardingFailure>>;
}

export interface OnboardingWorkflowPort {
  saveSection(input: {
    readonly context: OrganizationOperationContext;
    readonly onboardingId: Identifier<"Onboarding">;
    readonly expectedRevision: number;
    readonly section: OnboardingSectionSubmissionDto;
  }): Promise<Result<OnboardingViewDto, OnboardingFailure>>;
  submit(input: {
    readonly context: OrganizationOperationContext;
    readonly onboardingId: Identifier<"Onboarding">;
    readonly expectedRevision: number;
  }): Promise<Result<OnboardingViewDto, OnboardingFailure>>;
}

/** Review deliberately uses platform authority, never a tenant owner's role. */
export interface OnboardingReviewContext {
  readonly platform: PlatformContext;
  readonly authorization: AuthorizedOperation & {
    readonly request: Extract<AuthorizationRequest, { scope: "platform" }> & {
      readonly permission: {
        readonly scope: "platform";
        readonly resource: "onboarding";
        readonly action: "review";
      };
    };
  };
  readonly ownership: ResourceOwnership;
}

export interface OnboardingReviewPort {
  startReview(input: {
    readonly context: OnboardingReviewContext;
    readonly organizationId: OrganizationId;
    readonly onboardingId: Identifier<"Onboarding">;
    readonly expectedRevision: number;
  }): Promise<Result<OnboardingViewDto, OnboardingFailure>>;
  decide(input: {
    readonly context: OnboardingReviewContext;
    readonly organizationId: OrganizationId;
    readonly onboardingId: Identifier<"Onboarding">;
    readonly expectedRevision: number;
    readonly decision: OnboardingReviewDecisionDto;
  }): Promise<Result<OnboardingViewDto, OnboardingFailure>>;
}
