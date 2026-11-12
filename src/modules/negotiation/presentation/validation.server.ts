import "server-only";
import { z } from "zod";
import type { NegotiationOfferDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const negotiationOfferSchema = z.strictObject({
  threadId: z.uuid(),
  predecessorId: z.uuid().nullable(),
  amount: z.strictObject({
    amount: z.string().regex(/^(0|[1-9]\d{0,11})\.\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  expectedRevision: z.number().int().min(1),
}) satisfies z.ZodType<NegotiationOfferDto>;
