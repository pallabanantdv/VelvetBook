import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { OrganizationId, StoreId } from "@/core/identifiers";
import type { FavoriteBusiness } from "../../domain/entities/model";
import type {
  FavoriteBusinessInputDto,
  FavoritesPageDto,
} from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export interface FavoritesRepository {
  listSelf(input: {
    readonly context: CustomerOperationContext;
    readonly page: FavoritesPageDto;
  }): Promise<Result<readonly FavoriteBusiness[], RepositoryFailure>>;
  setSelf(input: {
    readonly context: CustomerOperationContext;
    readonly organizationId: OrganizationId;
    readonly storeId: StoreId;
    readonly favorite: boolean;
  }): Promise<Result<void, RepositoryFailure>>;
}
export interface FavoritesPort {
  set(input: {
    readonly context: CustomerOperationContext;
    readonly target: FavoriteBusinessInputDto;
    readonly favorite: boolean;
  }): Promise<Result<void, FeatureFailure>>;
}
