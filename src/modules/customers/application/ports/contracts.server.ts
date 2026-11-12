import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { CustomerProfile } from "../../domain/entities/model";
import type {
  CustomerProfileInputDto,
  CustomerProfileDto,
} from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export interface CustomerProfileRepository {
  findSelf(
    context: CustomerOperationContext,
  ): Promise<Result<CustomerProfile | null, RepositoryFailure>>;
  saveSelf(input: {
    readonly context: CustomerOperationContext;
    readonly profile: CustomerProfile;
    readonly expectedRevision: number | null;
  }): Promise<Result<CustomerProfile, RepositoryFailure>>;
}
export interface CustomerProfilePort {
  updateSelf(input: {
    readonly context: CustomerOperationContext;
    readonly expectedRevision: number;
    readonly profile: CustomerProfileInputDto;
  }): Promise<Result<CustomerProfileDto, FeatureFailure>>;
}
