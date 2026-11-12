import type {
  Identifier,
  OrganizationId,
  StoreId,
  UserId,
  MembershipId,
  BookingId,
} from "@/core/identifiers";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export type MessageParticipant =
  | { readonly kind: "customer"; readonly userId: UserId }
  | {
      readonly kind: "organization";
      readonly userId: UserId;
      readonly membershipId: MembershipId;
    };
export interface Conversation {
  readonly id: Identifier<"Conversation">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly customerUserId: UserId;
  readonly bookingId: BookingId | null;
  readonly participants: readonly MessageParticipant[];
  readonly state: "open" | "closed";
  readonly createdAt: Date;
}
export interface Message {
  readonly id: Identifier<"Message">;
  readonly conversationId: Identifier<"Conversation">;
  readonly organizationId: OrganizationId;
  readonly sender: MessageParticipant;
  readonly body: string;
  readonly sequence: number;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
}
