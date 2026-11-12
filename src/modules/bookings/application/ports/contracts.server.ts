import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type {
  CustomerOperationContext,
  OrganizationOperationContext,
} from "@/modules/authorization/application/public";
import type { BookingId } from "@/core/identifiers";
import type { Money } from "@/core/money";
import type { TimeRange } from "@/core/time";
import type { Booking } from "../../domain/entities/model";
import type {
  CreateBookingDto,
  RescheduleBookingDto,
  BookingViewDto,
} from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export type BookingActorContext =
  CustomerOperationContext | OrganizationOperationContext;
export interface BookingRepository {
  findById(input: {
    readonly context: BookingActorContext;
    readonly bookingId: BookingId;
  }): Promise<Result<Booking | null, RepositoryFailure>>;
}
export interface BookingCreationPort {
  create(input: {
    readonly context: CustomerOperationContext;
    readonly request: CreateBookingDto;
  }): Promise<Result<BookingViewDto, FeatureFailure>>;
}
export interface BookingReschedulingPort {
  reschedule(input: {
    readonly context: BookingActorContext;
    readonly request: RescheduleBookingDto;
  }): Promise<Result<BookingViewDto, FeatureFailure>>;
}
export interface BookingPolicyPort {
  cancellation(input: {
    readonly booking: Booking;
    readonly actor: BookingActorContext;
    readonly requestedAt: Date;
  }): Promise<
    Result<
      {
        readonly allowed: boolean;
        readonly fee: Money;
        readonly reason: string | null;
      },
      FeatureFailure
    >
  >;
  rescheduling(input: {
    readonly booking: Booking;
    readonly actor: BookingActorContext;
    readonly requestedAt: Date;
    readonly proposedRange: TimeRange;
  }): Promise<
    Result<
      { readonly allowed: boolean; readonly reason: string | null },
      FeatureFailure
    >
  >;
  expiration(input: {
    readonly booking: Booking;
    readonly evaluatedAt: Date;
  }): Promise<
    Result<
      { readonly eligible: boolean; readonly reason: string | null },
      FeatureFailure
    >
  >;
  noShow(input: {
    readonly booking: Booking;
    readonly evaluatedAt: Date;
    readonly checkedIn: boolean;
  }): Promise<
    Result<
      { readonly eligible: boolean; readonly reason: string | null },
      FeatureFailure
    >
  >;
}
export interface BookingCancellationPort {
  cancel(input: {
    readonly context: BookingActorContext;
    readonly bookingId: BookingId;
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
    readonly reason: string;
  }): Promise<Result<BookingViewDto, FeatureFailure>>;
}
/** One future transactional adapter owns locks, rechecks, inserts, idempotency and snapshots. */
export interface BookingCommitPort {
  commitNew(input: {
    readonly context: CustomerOperationContext;
    readonly request: CreateBookingDto;
  }): Promise<Result<Booking, FeatureFailure>>;
}
