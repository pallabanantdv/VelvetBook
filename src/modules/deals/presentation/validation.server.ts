import "server-only";
import { z } from "zod";
import type { DealSelectionDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const dealSelectionSchema = z.strictObject({
  storeId: z.uuid(),
  code: z
    .string()
    .regex(/^[A-Z0-9_-]+$/)
    .max(64),
}) satisfies z.ZodType<DealSelectionDto>;
