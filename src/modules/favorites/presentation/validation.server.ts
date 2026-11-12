import "server-only";
import { z } from "zod";
import type { FavoriteBusinessInputDto } from "../application/dtos/contracts";
/** Structural only. Ownership, order, lifecycle and cross-row invariants are future checks. */
export const favoriteBusinessInputSchema = z.strictObject({
  storeId: z.uuid(),
}) satisfies z.ZodType<FavoriteBusinessInputDto>;
