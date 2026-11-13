import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";

import type {
  RawWebhook,
  VerifiedWebhook,
  ResolvedWebhookAccount,
  WebhookInboxRecord,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface WebhookVerificationPort {
  verify(
    input: RawWebhook,
  ): Promise<Result<VerifiedWebhook, IntegrationFailure>>;
}
export interface WebhookAccountResolutionPort {
  resolve(
    input: VerifiedWebhook,
  ): Promise<Result<ResolvedWebhookAccount, IntegrationFailure>>;
}
export interface WebhookInboxPort {
  recordOnce(input: ResolvedWebhookAccount): Promise<
    Result<
      {
        readonly kind: "stored" | "duplicate";
        readonly record: WebhookInboxRecord;
      },
      IntegrationFailure
    >
  >;
}
export interface WebhookProcessingPort {
  process(input: {
    readonly context: IntegrationCallContext;
    readonly record: WebhookInboxRecord;
  }): Promise<
    Result<
      { readonly state: "processed" | "retry_pending" | "dead_letter" },
      IntegrationFailure
    >
  >;
}
