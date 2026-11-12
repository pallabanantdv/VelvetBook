import type {
  DealId,
  OrganizationId,
  BookingId,
  UserId,
} from "@/core/identifiers";
import type { Money } from "@/core/money";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export type DealDiscount =
  | { readonly kind: "percentage"; readonly percentage: string }
  | { readonly kind: "fixed"; readonly amount: Money };
export interface Deal {
  readonly id: DealId;
  readonly organizationId: OrganizationId;
  readonly code: string;
  readonly name: string;
  readonly discount: DealDiscount;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly archivedAt: Date | null;
  readonly revision: number;
}
export interface DealRedemption {
  readonly dealId: DealId;
  readonly bookingId: BookingId;
  readonly customerUserId: UserId;
  readonly discountSnapshot: Money;
  readonly redeemedAt: Date;
}
