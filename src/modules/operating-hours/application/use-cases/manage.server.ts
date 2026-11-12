import "server-only";
import type { ApplicationError } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type { StoreId } from "@/core/identifiers";
import type {
  OperatingHoursDraftDto,
  OperatingHoursViewDto,
} from "../dtos/contracts";

export interface ManageOperatingHoursPort {
  /** Proposed draft write only; does not publish, approve, activate, or grant roles. */
  saveDraft(input: {
    readonly context: OrganizationOperationContext;
    readonly targetId: string | null;
    readonly storeId: StoreId;
    readonly expectedRevision: number | null;
    readonly draft: OperatingHoursDraftDto;
  }): Promise<
    Result<
      OperatingHoursViewDto,
      ApplicationError<
        "invalid_input" | "access_denied" | "conflict" | "unavailable"
      >
    >
  >;
}
