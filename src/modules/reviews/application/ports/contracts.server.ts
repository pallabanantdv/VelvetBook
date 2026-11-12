import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { Review } from "../../domain/entities/model";
import type { ReviewInputDto } from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export interface ReviewEligibilityPort {
  verifyCompletedOwnBooking(input: {
    readonly context: CustomerOperationContext;
    readonly bookingId: string;
  }): Promise<
    Result<
      {
        readonly eligible: true;
        readonly organizationId: Review["organizationId"];
        readonly storeId: Review["storeId"];
      },
      FeatureFailure
    >
  >;
}
export interface ReviewRepository {
  saveOwn(input: {
    readonly context: CustomerOperationContext;
    readonly review: Review;
  }): Promise<Result<Review, RepositoryFailure>>;
}
export interface ReviewsPort {
  submit(input: {
    readonly context: CustomerOperationContext;
    readonly review: ReviewInputDto;
  }): Promise<Result<Review, FeatureFailure>>;
}
