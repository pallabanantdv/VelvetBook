import "server-only";
import type { Result } from "@/core/results";
import type {
  AdminFailure,
  AdminOperationContext,
  SensitiveAdminContext,
} from "@/modules/admin/application/public";
import type {
  OrganizationApprovalCase,
  ApprovalDecisionRecord,
} from "../../domain/entities/model";
import type { OrganizationApprovalDecisionDto } from "../dtos/contracts";
import type {
  OnboardingReviewContext,
  OnboardingReviewDecisionDto,
  OnboardingViewDto,
} from "@/modules/onboarding/application/public";
/** Proposed contracts only; exact permission, scope and fingerprint must match on use. */
export type ApprovalReadContext = AdminOperationContext<{
  readonly scope: "platform";
  readonly resource: "onboarding";
  readonly action: "read";
}>;
export type ApprovalDecisionContext = SensitiveAdminContext<{
  readonly scope: "platform";
  readonly resource: "onboarding";
  readonly action: "review";
}>;
export interface OrganizationApprovalRepository {
  find(input: {
    readonly context: ApprovalReadContext;
    readonly caseId: OrganizationApprovalCase["id"];
  }): Promise<Result<OrganizationApprovalCase | null, AdminFailure>>;
}
export interface OrganizationApprovalPort {
  decide(input: {
    readonly context: ApprovalDecisionContext;
    readonly request: OrganizationApprovalDecisionDto;
  }): Promise<Result<ApprovalDecisionRecord, AdminFailure>>;
}
/** Future adapter bridges to onboarding's existing contracts, never direct table writes. */
export interface OrganizationOnboardingReviewBridgePort {
  resolve(input: {
    readonly context: ApprovalDecisionContext;
    readonly approvalCase: OrganizationApprovalCase;
  }): Promise<Result<OnboardingReviewContext, AdminFailure>>;
  decide(input: {
    readonly context: OnboardingReviewContext;
    readonly approvalCase: OrganizationApprovalCase;
    readonly decision: OnboardingReviewDecisionDto;
  }): Promise<Result<OnboardingViewDto, AdminFailure>>;
}
