import "server-only";
import { z } from "zod";
import type { BusinessPhotoDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const businessPhotosDraftSchema = z.strictObject({
  placement: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("organization") }),
    z.strictObject({ kind: z.literal("store"), storeId: z.uuid() }),
  ]),
  assetId: z.uuid(),
  altText: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).max(2147483647),
}) satisfies z.ZodType<BusinessPhotoDraftDto>;
