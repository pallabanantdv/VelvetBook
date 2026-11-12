import type {
  OrganizationId,
  StoreId,
  StaffId,
  MembershipId,
  ServiceId,
  BookingId,
} from "@/core/identifiers";
import type { TimeRange } from "@/core/time";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export interface TimeSlot {
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly serviceId: ServiceId;
  readonly staffId: StaffId | null;
  readonly range: TimeRange;
  readonly capacityUnits: number;
  readonly snapshotVersion: string;
  readonly observedAt: Date;
}
export interface CapacityResource {
  readonly key: string;
  readonly units: number;
  readonly revision: number;
}
export interface ConflictingBooking {
  readonly bookingId: BookingId;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly membershipId: MembershipId | null;
  readonly range: TimeRange;
  readonly units: number;
  readonly state: "pending" | "confirmed" | "in_progress";
  readonly holdExpiresAt: Date | null;
}
