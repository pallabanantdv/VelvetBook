import "server-only";
import { z } from "zod";
import type { ServiceDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const servicesDraftSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  durationMinutes: z.number().int().min(1).max(2147483647),
  price: z.strictObject({
    amount: z.string().regex(/^(0|[1-9]\d{0,11})\.\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
}) satisfies z.ZodType<ServiceDraftDto>;
