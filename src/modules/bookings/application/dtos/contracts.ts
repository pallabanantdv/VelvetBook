import type { BookingState } from "../../domain/entities/model";
export interface CreateBookingDto {
  readonly storeId: string;
  readonly startsAt: string;
  readonly serviceIds: readonly string[];
  readonly staffId: string | null;
  readonly products: readonly {
    readonly productId: string;
    readonly quantity: number;
  }[];
  readonly dealCode: string | null;
  readonly idempotencyKey: string;
}
export interface RescheduleBookingDto {
  readonly bookingId: string;
  readonly startsAt: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
}
export interface BookingViewDto {
  readonly id: string;
  readonly state: BookingState;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly total: { readonly amount: string; readonly currency: string };
  readonly revision: number;
}
