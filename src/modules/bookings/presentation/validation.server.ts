import "server-only";
import { z } from "zod";
import type { CreateBookingDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const createBookingSchema = z.strictObject({
  storeId: z.uuid(),
  startsAt: z.iso.datetime(),
  serviceIds: z.array(z.uuid()).min(1).max(20),
  staffId: z.uuid().nullable(),
  products: z
    .array(
      z.strictObject({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .max(100),
  dealCode: z
    .string()
    .regex(/^[A-Z0-9_-]+$/)
    .max(64)
    .nullable(),
  idempotencyKey: z.string().min(1).max(128),
}) satisfies z.ZodType<CreateBookingDto>;
