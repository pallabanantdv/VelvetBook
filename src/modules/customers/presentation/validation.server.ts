import "server-only";
import { z } from "zod";
import type { CustomerProfileInputDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const customerProfileInputSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(200),
  locale: z.string().min(2).max(35),
  timezone: z.string().min(1).max(100).nullable(),
}) satisfies z.ZodType<CustomerProfileInputDto>;
