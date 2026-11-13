import type { Identifier, OrganizationId } from "@/core/identifiers";
import type { Money } from "@/core/money";
export type RefundState =
  "requested" | "pending" | "succeeded" | "failed" | "cancelled";
export interface Refund {
  readonly id: Identifier<"Refund">;
  readonly organizationId: OrganizationId;
  readonly paymentId: Identifier<"Payment">;
  readonly amount: Money;
  readonly state: RefundState;
  readonly providerRefundId: string | null;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly reason: string;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
