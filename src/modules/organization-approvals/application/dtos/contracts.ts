export interface OrganizationApprovalDecisionDto {
  readonly caseId: string;
  readonly organizationId: string;
  readonly onboardingId: string;
  readonly expectedCaseRevision: number;
  readonly expectedSubmissionRevision: number;
  readonly decision: "approved" | "rejected";
  readonly reason: string;
}
