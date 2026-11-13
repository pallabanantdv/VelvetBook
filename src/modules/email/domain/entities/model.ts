import type { Identifier } from "@/core/identifiers";
export interface EmailTemplateInput {
  readonly templateKey: string;
  readonly locale: string;
  readonly variables: Readonly<Record<string, string>>;
}
declare const renderedEmail: unique symbol;
export interface RenderedEmail {
  readonly [renderedEmail]: true;
  readonly subject: string;
  readonly text: string;
  readonly html: string | null;
}
export interface EmailMessage {
  readonly id: Identifier<"Email">;
  readonly recipientAddress: string;
  readonly senderProfileRef: string;
  readonly content: RenderedEmail;
  readonly notificationId: Identifier<"Notification"> | null;
}
export type EmailDeliveryState =
  | "accepted"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "unknown_outcome";
