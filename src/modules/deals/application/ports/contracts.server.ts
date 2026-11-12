import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type {
  CustomerOperationContext,
  OrganizationOperationContext,
} from "@/modules/authorization/application/public";
import type { OrganizationId, DealId } from "@/core/identifiers";
import type { Money } from "@/core/money";
import type { Deal } from "../../domain/entities/model";
import type { DealSelectionDto } from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export interface DealRepository {
  findById(input: {
    readonly context: OrganizationOperationContext;
    readonly dealId: DealId;
  }): Promise<Result<Deal | null, RepositoryFailure>>;
}
export interface DealEligibilityPort {
  inspect(input: {
    readonly context: CustomerOperationContext;
    readonly selection: DealSelectionDto;
    readonly quotedTotal: Money;
    readonly evaluatedAt: Date;
  }): Promise<
    Result<
      {
        readonly organizationId: OrganizationId;
        readonly deal: Deal;
        readonly discount: Money;
        readonly quoteExpiresAt: Date;
      },
      FeatureFailure
    >
  >;
}
