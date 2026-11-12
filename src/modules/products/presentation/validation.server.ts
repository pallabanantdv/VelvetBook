import "server-only";
import { z } from "zod";
import type { ProductDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const productsDraftSchema = z.strictObject({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  price: z.strictObject({
    amount: z.string().regex(/^(0|[1-9]\d{0,11})\.\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
}) satisfies z.ZodType<ProductDraftDto>;
