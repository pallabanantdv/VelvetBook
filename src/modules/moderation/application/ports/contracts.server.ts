import "server-only";
import type { Result } from "@/core/results";
import type {
  AdminFailure,
  AdminOperationContext,
  SensitiveAdminContext,
} from "@/modules/admin/application/public";
import type {
  ModerationTarget,
  ModerationCase,
  ModerationDecision,
} from "../../domain/entities/model";
import type { ModerationDecisionDto } from "../dtos/contracts";

/** Proposed contracts only; exact permission, scope and fingerprint must match on use. */
export type ModerationReadContext = AdminOperationContext<{
  readonly scope: "platform";
  readonly resource: "moderation";
  readonly action: "read";
}>;
export type ModerationDecisionContext = SensitiveAdminContext<{
  readonly scope: "platform";
  readonly resource: "moderation";
  readonly action: "decide";
}>;
export interface ModerationRepository {
  find(input: {
    readonly context: ModerationReadContext;
    readonly caseId: ModerationCase["id"];
  }): Promise<Result<ModerationCase | null, AdminFailure>>;
}
export interface ModerationPort {
  decide(input: {
    readonly context: ModerationDecisionContext;
    readonly decision: ModerationDecisionDto;
  }): Promise<Result<ModerationDecision, AdminFailure>>;
}
export interface ModerationEvidencePort {
  inspect(input: {
    readonly context: ModerationReadContext;
    readonly target: ModerationTarget;
  }): Promise<
    Result<
      {
        readonly evidenceRef: string;
        readonly evidenceRevision: number;
        readonly redactedSummary: string;
      },
      AdminFailure
    >
  >;
}
