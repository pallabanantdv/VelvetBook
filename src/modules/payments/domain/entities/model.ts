import type { Identifier, OrganizationId, BookingId } from "@/core/identifiers";
import type { Money } from "@/core/money";
export type PaymentState =
  "initiating" | "pending" | "succeeded" | "failed" | "cancelled";
export type PaymentRefundState =
  "none" | "pending" | "partially_refunded" | "refunded" | "failed";
export interface Payment {
  readonly id: Identifier<"Payment">;
  readonly organizationId: OrganizationId;
  readonly bookingId: BookingId;
  readonly amount: Money;
  readonly state: PaymentState;
  readonly refundState: PaymentRefundState;
  readonly providerAccountRef: string;
  readonly providerPaymentId: string | null;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
export type PaymentNextAction =
  | { readonly kind: "none" }
  | {
      readonly kind: "redirect";
      readonly url: string;
      readonly expiresAt: Date;
    }
  | {
      readonly kind: "opaque_client_action";
      readonly value: string;
      readonly expiresAt: Date;
    };
