import "server-only";
export type OnboardingCommand =
  | { kind: "select-stores"; expectedRevision: number; selectedStoreIds: string[] }
  | { kind: "confirm-review" | "submit" | "reopen"; expectedRevision: number };
export type AdminOnboardingCommand =
  | { kind: "start-review"; expectedRevision: number }
  | { kind: "propose"; expectedRevision: number; decision: "approved" | "rejected"; reason: string }
  | { kind: "apply"; expectedRevision: number; decisionId: string };
export interface OnboardingRuntimePort {
  read(organizationId: string): Promise<Record<string, unknown>>;
  execute(organizationId: string, command: OnboardingCommand, key: string): Promise<Record<string, unknown>>;
  readCase(submissionId: string): Promise<Record<string, unknown>>;
  review(submissionId: string, command: AdminOnboardingCommand, key: string): Promise<Record<string, unknown>>;
}
/** All revision/readiness/authority rechecks execute inside the atomic persistence port. */
export class OnboardingService {
  constructor(readonly persistence: OnboardingRuntimePort) {}
  read(id: string) { return this.persistence.read(id); }
  execute(id: string, command: OnboardingCommand, key: string) { return this.persistence.execute(id, command, key); }
  readCase(id: string) { return this.persistence.readCase(id); }
  review(id: string, command: AdminOnboardingCommand, key: string) { return this.persistence.review(id, command, key); }
}
