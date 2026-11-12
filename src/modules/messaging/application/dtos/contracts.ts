export interface SendMessageDto {
  readonly conversationId: string;
  readonly body: string;
  readonly idempotencyKey: string;
}
export interface MessagePageDto {
  readonly conversationId: string;
  readonly beforeSequence: number | null;
  readonly limit: number;
}
