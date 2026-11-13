import type {
  Identifier,
  UserId,
  OrganizationId,
  BookingId,
} from "@/core/identifiers";
export type NotificationChannel = "email" | "sms" | "push";
export type DeliveryState =
  | "queued"
  | "sending"
  | "accepted"
  | "delivered"
  | "failed"
  | "suppressed"
  | "unknown_outcome";
export type NotificationContent =
  | { readonly kind: "booking_confirmed"; readonly bookingId: BookingId }
  | {
      readonly kind: "payment_updated";
      readonly paymentId: Identifier<"Payment">;
    }
  | {
      readonly kind: "message_received";
      readonly conversationId: Identifier<"Conversation">;
    };
export interface NotificationIntent {
  readonly id: Identifier<"Notification">;
  readonly organizationId: OrganizationId | null;
  readonly recipientUserId: UserId;
  readonly channel: NotificationChannel;
  readonly destinationRef: Identifier<"ContactDestination">;
  readonly content: NotificationContent;
  readonly locale: string;
  readonly sourceEventId: Identifier<"DomainEvent">;
  readonly state: DeliveryState;
  readonly createdAt: Date;
}
