import type {
  BookingId,
  BookingItemId,
  OrganizationId,
  StoreId,
  UserId,
  StaffId,
  MembershipId,
  ServiceId,
  ProductId,
  DealId,
} from "@/core/identifiers";
import type { Money } from "@/core/money";
import type { TimeRange } from "@/core/time";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export type BookingState =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show";
export interface BookingStaffAssignment {
  readonly staffId: StaffId;
  readonly membershipId: MembershipId;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
}
export type BookingItem = {
  readonly id: BookingItemId;
  readonly nameSnapshot: string;
  readonly unitPrice: Money;
} & (
  | {
      readonly kind: "service";
      readonly serviceId: ServiceId;
      readonly quantity: 1;
      readonly durationMinutes: number;
      readonly range: TimeRange;
      readonly staff: BookingStaffAssignment | null;
    }
  | {
      readonly kind: "product";
      readonly productId: ProductId;
      readonly quantity: number;
    }
);
export interface BookingPolicySnapshot {
  readonly version: string;
  readonly cancellationCutoffMinutes: number;
  readonly cancellationFee: Money;
  readonly rescheduleCutoffMinutes: number;
  readonly holdDurationMinutes: number;
  readonly noShowGraceMinutes: number;
}
export interface Booking {
  readonly id: BookingId;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly customerUserId: UserId;
  readonly state: BookingState;
  readonly range: TimeRange;
  readonly items: readonly BookingItem[];
  readonly dealId: DealId | null;
  readonly total: Money;
  readonly policy: BookingPolicySnapshot;
  readonly holdExpiresAt: Date | null;
  readonly revision: number;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
