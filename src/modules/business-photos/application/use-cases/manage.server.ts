import "server-only";
import type { ApplicationError } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type {
  BusinessPhotoDraftDto,
  BusinessPhotoViewDto,
} from "../dtos/contracts";

export interface ManageBusinessPhotoPort {
  /** Proposed draft write only; does not publish, approve, activate, or grant roles. */
  saveDraft(input: {
    readonly context: OrganizationOperationContext;
    readonly targetId: string | null;
    readonly expectedRevision: number | null;
    readonly draft: BusinessPhotoDraftDto;
  }): Promise<
    Result<
      BusinessPhotoViewDto,
      ApplicationError<
        "invalid_input" | "access_denied" | "conflict" | "unavailable"
      >
    >
  >;
}
