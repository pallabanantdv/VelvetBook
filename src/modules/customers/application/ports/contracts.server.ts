import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { CustomerProfile } from "../../domain/entities/model";
import type {
  CustomerProfilePatchDto,
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
  ): Promise<Result<CustomerProfile | null, ProfileRepositoryFailure>>;
  saveSelf(input: {
    readonly context: CustomerOperationContext;
    readonly profile: CustomerProfile;
    readonly expectedRevision: number | null;
  }): Promise<Result<CustomerProfile, ProfileRepositoryFailure>>;
}
export type ProfileRepositoryFailure = RepositoryFailure | ApplicationError<"access_denied">;
export interface CustomerProfilePort {
  readSelf(context: CustomerOperationContext): Promise<Result<CustomerProfileDto | null, FeatureFailure>>;
  updateSelf(input: {
    readonly context: CustomerOperationContext;
    readonly expectedRevision: number;
    readonly profile: CustomerProfilePatchDto;
  }): Promise<Result<CustomerProfileDto, FeatureFailure>>;
}
