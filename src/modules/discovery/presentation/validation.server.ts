import "server-only";
import { z } from "zod";
import type { DiscoverySearchDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const discoverySearchSchema = z.strictObject({
  location: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("text"),
      query: z.string().trim().min(1).max(200),
    }),
    z.strictObject({
      kind: z.literal("radius"),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusKm: z.number().positive().max(200),
    }),
  ]),
  categoryIds: z.array(z.string().min(1).max(100)).max(20),
  price: z
    .strictObject({
      minimum: z
        .string()
        .regex(/^(0|[1-9]\d{0,11})\.\d{2}$/)
        .nullable(),
      maximum: z
        .string()
        .regex(/^(0|[1-9]\d{0,11})\.\d{2}$/)
        .nullable(),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .nullable(),
  availability: z
    .strictObject({
      after: z.iso.datetime(),
      before: z.iso.datetime(),
      serviceId: z.uuid(),
    })
    .nullable(),
  sort: z.enum([
    "relevance",
    "distance",
    "price_asc",
    "price_desc",
    "rating",
    "soonest",
  ]),
  cursor: z.string().max(500).nullable(),
  limit: z.number().int().min(1).max(100),
}) satisfies z.ZodType<DiscoverySearchDto>;
