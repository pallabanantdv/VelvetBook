import type { Identifier, OrganizationId } from "@/core/identifiers";
export interface WebhookSource {
  readonly providerNamespace: string;
  readonly endpointId: Identifier<"WebhookEndpoint">;
}
export interface RawWebhook {
  readonly source: WebhookSource;
  readonly headers: Readonly<Record<string, string | readonly string[]>>;
  readonly rawBody: Uint8Array;
  readonly receivedAt: Date;
}
declare const verifiedWebhook: unique symbol;
export interface VerifiedWebhook {
  readonly [verifiedWebhook]: true;
  readonly source: WebhookSource;
  readonly providerEventId: string;
  readonly providerAccountRef: string;
  readonly signedAt: Date;
  readonly receivedAt: Date;
  readonly bodySha256: string;
  readonly normalizedEvent: {
    readonly kind: string;
    readonly providerObjectId: string;
    readonly providerState: string;
  };
}
declare const resolvedWebhookAccount: unique symbol;
export interface ResolvedWebhookAccount {
  readonly [resolvedWebhookAccount]: true;
  readonly organizationId: OrganizationId;
  readonly providerAccountRef: string;
  readonly verified: VerifiedWebhook;
}
export interface WebhookInboxRecord {
  readonly id: Identifier<"WebhookInbox">;
  readonly account: ResolvedWebhookAccount;
  readonly state:
    "received" | "processing" | "processed" | "retry_pending" | "dead_letter";
  readonly attempt: number;
}
