import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";

import type {
  DomainEvent,
  EventTransactionContext,
  CommittedOutboxRecord,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface EventOutboxPort {
  append(input: {
    readonly transaction: EventTransactionContext;
    readonly events: readonly DomainEvent[];
  }): Promise<Result<void, IntegrationFailure>>;
}
export interface EventPublisherPort {
  publishCommitted(input: {
    readonly context: IntegrationCallContext;
    readonly records: readonly CommittedOutboxRecord[];
  }): Promise<
    Result<
      { readonly acceptedEventIds: readonly DomainEvent["eventId"][] },
      IntegrationFailure
    >
  >;
}
export interface EventConsumerInboxPort {
  claimOnce(input: {
    readonly transaction: EventTransactionContext;
    readonly context: IntegrationCallContext;
    readonly consumerName: string;
    readonly event: DomainEvent;
  }): Promise<
    Result<{ readonly kind: "new" | "duplicate" }, IntegrationFailure>
  >;
}
