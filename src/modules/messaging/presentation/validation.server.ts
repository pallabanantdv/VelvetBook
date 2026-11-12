import "server-only";
import { z } from "zod";
import type { SendMessageDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const sendMessageSchema = z.strictObject({
  conversationId: z.uuid(),
  body: z.string().trim().min(1).max(5000),
  idempotencyKey: z.string().min(1).max(128),
}) satisfies z.ZodType<SendMessageDto>;
