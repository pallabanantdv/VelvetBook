import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";
import type { Money } from "@/core/money";
import type { Identifier } from "@/core/identifiers";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type { Refund, RefundState } from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface RefundRequestPort {
  request(input: {
    readonly context: OrganizationOperationContext;
    readonly paymentId: Identifier<"Payment">;
    readonly amount: Money;
    readonly reason: string;
    readonly idempotencyKey: string;
  }): Promise<Result<Refund, IntegrationFailure>>;
}
export interface RefundProviderPort {
  request(input: {
    readonly context: IntegrationCallContext;
    readonly refundId: Refund["id"];
    readonly providerAccountRef: string;
    readonly providerPaymentId: string;
    readonly amount: Money;
    readonly reasonCode: string;
  }): Promise<
    Result<
      {
        readonly providerRefundId: string;
        readonly state: RefundState;
        readonly amount: Money;
        readonly providerPaymentId: string;
      },
      IntegrationFailure
    >
  >;
  lookup(input: {
    readonly context: IntegrationCallContext;
    readonly providerAccountRef: string;
    readonly providerRefundId: string | null;
    readonly originalIdempotencyKey: string;
  }): Promise<
    Result<
      {
        readonly providerRefundId: string;
        readonly state: RefundState;
        readonly amount: Money;
        readonly providerPaymentId: string;
      },
      IntegrationFailure
    >
  >;
}
export interface RefundReservationPort {
  reserve(input: {
    readonly context: IntegrationCallContext;
    readonly refund: Refund;
    readonly expectedPaymentRevision: number;
  }): Promise<Result<Refund, IntegrationFailure>>;
}
