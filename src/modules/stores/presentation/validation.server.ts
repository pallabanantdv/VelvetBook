import "server-only";
import { z } from "zod";
import type { StoreDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const storesDraftSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  slug: z.string().min(1).max(100),
  timezone: z.string().min(1).max(100),
  address: z.string().max(2000).nullable(),
}) satisfies z.ZodType<StoreDraftDto>;
