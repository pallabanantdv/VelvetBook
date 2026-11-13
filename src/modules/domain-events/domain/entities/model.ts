import type {
  Identifier,
  OrganizationId,
  BookingId,
  StoreId,
} from "@/core/identifiers";
import type { TransactionContext } from "@/core/transactions";
export interface EventPayloads {
  "booking.confirmed.v1": {
    readonly bookingId: BookingId;
    readonly storeId: StoreId;
  };
  "booking.cancelled.v1": {
    readonly bookingId: BookingId;
    readonly storeId: StoreId;
  };
  "booking.rescheduled.v1": {
    readonly bookingId: BookingId;
    readonly storeId: StoreId;
  };
  "booking.expired.v1": {
    readonly bookingId: BookingId;
    readonly storeId: StoreId;
  };
  "payment.succeeded.v1": {
    readonly paymentId: Identifier<"Payment">;
    readonly bookingId: BookingId;
  };
  "refund.succeeded.v1": {
    readonly refundId: Identifier<"Refund">;
    readonly paymentId: Identifier<"Payment">;
  };
  "message.created.v1": {
    readonly messageId: Identifier<"Message">;
    readonly conversationId: Identifier<"Conversation">;
  };
}
export type DomainEvent = {
  [K in keyof EventPayloads]: {
    readonly eventId: Identifier<"DomainEvent">;
    readonly type: K;
    readonly organizationId: OrganizationId;
    readonly aggregateId: string;
    readonly aggregateVersion: number;
    readonly occurredAt: Date;
    readonly correlationId: string;
    readonly causationId: string | null;
    readonly payload: EventPayloads[K];
  };
}[keyof EventPayloads];
declare const outboxTransaction: unique symbol;
export interface EventTransactionContext extends TransactionContext {
  readonly organizationId: OrganizationId;
  readonly [outboxTransaction]: true;
  readonly transactionId: Identifier<"Transaction">;
}
declare const committedOutbox: unique symbol;
export interface CommittedOutboxRecord {
  readonly [committedOutbox]: true;
  readonly outboxId: Identifier<"Outbox">;
  readonly event: DomainEvent;
  readonly committedAt: Date;
  readonly attempt: number;
}
