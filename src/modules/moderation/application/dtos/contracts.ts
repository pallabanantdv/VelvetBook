export interface ModerationDecisionDto {
  readonly caseId: string;
  readonly expectedRevision: number;
  readonly expectedEvidenceRevision: number;
  readonly disposition: "allow" | "restrict" | "reject" | "escalate";
  readonly reasonCode: string;
  readonly policyVersion: string;
}
