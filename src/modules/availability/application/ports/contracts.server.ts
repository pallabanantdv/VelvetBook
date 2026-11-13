import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type {
  CustomerOperationContext,
  OrganizationOperationContext,
} from "@/modules/authorization/application/public";
import type { OrganizationId, StoreId } from "@/core/identifiers";
import type {
  TimeSlot,
  CapacityResource,
  ConflictingBooking,
} from "../../domain/entities/model";
import type { AvailabilityRequestDto } from "../dtos/contracts";
import type { OperatingHours } from "@/modules/operating-hours/application/public";
import type { Service } from "@/modules/services/application/public";
import type { StaffAssignment } from "@/modules/staff/application/public";
export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
declare const verifiedAvailabilityScope: unique symbol;
export interface AvailabilityScope {
  readonly [verifiedAvailabilityScope]: true;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly context: CustomerOperationContext | OrganizationOperationContext;
}
export interface AvailabilityInputs {
  readonly scope: AvailabilityScope;
  readonly openingHours: OperatingHours;
  readonly staffSchedules: readonly OperatingHours[];
  readonly assignments: readonly StaffAssignment[];
  readonly services: readonly Service[];
  readonly capacity: readonly CapacityResource[];
  readonly conflicts: readonly ConflictingBooking[];
  readonly observedAt: Date;
}
export interface OpeningHoursSourcePort {
  load(
    scope: AvailabilityScope,
  ): Promise<Result<OperatingHours, RepositoryFailure>>;
}
export interface StaffScheduleSourcePort {
  load(scope: AvailabilityScope): Promise<
    Result<
      {
        readonly assignments: readonly StaffAssignment[];
        readonly schedules: readonly OperatingHours[];
      },
      RepositoryFailure
    >
  >;
}
export interface ServiceDurationSourcePort {
  load(
    scope: AvailabilityScope,
  ): Promise<Result<readonly Service[], RepositoryFailure>>;
}
export interface CapacitySourcePort {
  load(
    scope: AvailabilityScope,
  ): Promise<Result<readonly CapacityResource[], RepositoryFailure>>;
}
export interface BookingConflictSourcePort {
  load(
    scope: AvailabilityScope,
  ): Promise<Result<readonly ConflictingBooking[], RepositoryFailure>>;
}
export interface AvailabilityCalculationPort {
  calculate(input: {
    readonly request: AvailabilityRequestDto;
    readonly inputs: AvailabilityInputs;
  }): Promise<Result<readonly TimeSlot[], FeatureFailure>>;
}
