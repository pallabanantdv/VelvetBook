import "server-only";
import { z } from "zod";
import type { ReviewInputDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const reviewInputSchema = z.strictObject({
  bookingId: z.uuid(),
  rating: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  body: z.string().trim().min(1).max(5000),
}) satisfies z.ZodType<ReviewInputDto>;
