import "server-only";
import type { ApplicationError } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type {
  OrganizationDraftDto,
  OrganizationViewDto,
} from "../dtos/contracts";

export interface ManageOrganizationPort {
  /** Proposed draft write only; does not publish, approve, activate, or grant roles. */
  saveDraft(input: {
    readonly context: OrganizationOperationContext;
    readonly targetId: string;
    readonly expectedRevision: number;
    readonly draft: OrganizationDraftDto;
  }): Promise<
    Result<
      OrganizationViewDto,
      ApplicationError<
        "invalid_input" | "access_denied" | "conflict" | "unavailable"
      >
    >
  >;
}
