import "server-only";
import { z } from "zod";
import type { BusinessVisibilityDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const visibilityDraftSchema = z.strictObject({
  requestedMode: z.enum(["hidden", "unlisted", "listed"]),
  bookingEnabled: z.boolean(),
}) satisfies z.ZodType<BusinessVisibilityDraftDto>;
