import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";
import type { BookingId } from "@/core/identifiers";
import type { Money } from "@/core/money";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type {
  Payment,
  PaymentState,
  PaymentNextAction,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface PaymentInitiationPort {
  start(input: {
    readonly context: CustomerOperationContext;
    readonly bookingId: BookingId;
    readonly idempotencyKey: string;
  }): Promise<Result<Payment, IntegrationFailure>>;
}
export interface PaymentProviderPort {
  initiate(input: {
    readonly context: IntegrationCallContext;
    readonly paymentId: Payment["id"];
    readonly bookingId: BookingId;
    readonly providerAccountRef: string;
    readonly amount: Money;
    readonly paymentInstrumentRef: string;
  }): Promise<
    Result<
      {
        readonly providerPaymentId: string;
        readonly state: PaymentState;
        readonly nextAction: PaymentNextAction;
      },
      IntegrationFailure
    >
  >;
  lookup(input: {
    readonly context: IntegrationCallContext;
    readonly providerAccountRef: string;
    readonly providerPaymentId: string | null;
    readonly originalIdempotencyKey: string;
  }): Promise<
    Result<
      {
        readonly providerPaymentId: string;
        readonly state: PaymentState;
        readonly amount: Money;
        readonly providerAccountRef: string;
      },
      IntegrationFailure
    >
  >;
  cancel(input: {
    readonly context: IntegrationCallContext;
    readonly providerAccountRef: string;
    readonly providerPaymentId: string;
  }): Promise<Result<{ readonly state: PaymentState }, IntegrationFailure>>;
}
export interface PaymentStateRepository {
  find(input: {
    readonly context: IntegrationCallContext;
    readonly paymentId: Payment["id"];
  }): Promise<Result<Payment | null, IntegrationFailure>>;
}
