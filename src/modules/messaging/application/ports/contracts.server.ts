import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type {
  CustomerOperationContext,
  OrganizationOperationContext,
} from "@/modules/authorization/application/public";
import type { Conversation, Message } from "../../domain/entities/model";
import type { SendMessageDto, MessagePageDto } from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export type MessagingActorContext =
  CustomerOperationContext | OrganizationOperationContext;
export interface ConversationAccessPort {
  verifyParticipant(input: {
    readonly context: MessagingActorContext;
    readonly conversationId: string;
  }): Promise<Result<Conversation, FeatureFailure>>;
}
export interface MessageRepository {
  list(input: {
    readonly context: MessagingActorContext;
    readonly page: MessagePageDto;
  }): Promise<Result<readonly Message[], RepositoryFailure>>;
}
export interface MessagingPort {
  send(input: {
    readonly context: MessagingActorContext;
    readonly message: SendMessageDto;
  }): Promise<Result<Message, FeatureFailure>>;
}
/** Optional future after-commit notification, not WebSocket/provider selection. */
export interface MessageNotificationPort {
  notifyCommitted(input: {
    readonly messageId: Message["id"];
    readonly conversationId: Conversation["id"];
  }): Promise<Result<void, FeatureFailure>>;
}
