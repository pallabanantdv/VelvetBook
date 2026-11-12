import "server-only";
import type { ApplicationError } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type { StoreId } from "@/core/identifiers";
import type { ServiceDraftDto, ServiceViewDto } from "../dtos/contracts";

export interface ManageServicePort {
  /** Proposed draft write only; does not publish, approve, activate, or grant roles. */
  saveDraft(input: {
    readonly context: OrganizationOperationContext;
    readonly targetId: string | null;
    readonly storeId: StoreId;
    readonly expectedRevision: number | null;
    readonly draft: ServiceDraftDto;
  }): Promise<
    Result<
      ServiceViewDto,
      ApplicationError<
        "invalid_input" | "access_denied" | "conflict" | "unavailable"
      >
    >
  >;
}
