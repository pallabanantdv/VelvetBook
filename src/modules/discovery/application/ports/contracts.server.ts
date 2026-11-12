import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { BusinessSearchResult } from "../../domain/entities/model";
import type { DiscoverySearchDto } from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export interface DiscoverySearchPort {
  search(input: {
    readonly context: CustomerOperationContext;
    readonly filters: DiscoverySearchDto;
  }): Promise<
    Result<
      {
        readonly businesses: readonly BusinessSearchResult[];
        readonly nextCursor: string | null;
      },
      FeatureFailure
    >
  >;
}
/** Only approved/public projections may leave the future search adapter. */
export interface DiscoveryProjectionPort {
  searchPublished(input: {
    readonly context: CustomerOperationContext;
    readonly filters: DiscoverySearchDto;
  }): Promise<Result<readonly BusinessSearchResult[], RepositoryFailure>>;
}
