import "server-only";
import { z } from "zod";
import type { AvailabilityRequestDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const availabilityRequestSchema = z.strictObject({
  storeId: z.uuid(),
  serviceIds: z.array(z.uuid()).min(1).max(20),
  staffId: z.uuid().nullable(),
  after: z.iso.datetime(),
  before: z.iso.datetime(),
  units: z.number().int().min(1).max(100),
}) satisfies z.ZodType<AvailabilityRequestDto>;
