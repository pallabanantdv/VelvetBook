import "server-only";
import { z } from "zod";
import { createPaginationInputSchema } from "./pagination.server";

/** Future self collections only. No booking/favorites query or cursor decoder is implemented. */
export const customerPaginationQuerySchema = z.strictObject({
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.string().regex(/^[1-9]\d{0,2}$/).transform(Number).optional(),
}).transform((value): z.input<ReturnType<typeof createPaginationInputSchema>> => ({ cursor: value.cursor ?? null, ...(value.limit === undefined ? {} : { limit: value.limit }) }))
  .pipe(createPaginationInputSchema({ defaultLimit: 25, maximumLimit: 100 }));

export function parseCustomerPaginationQuery(params: URLSearchParams) {
  const entries: Record<string, string> = Object.create(null);
  for (const [key, value] of params) {
    if (Object.hasOwn(entries, key)) return { success: false as const };
    entries[key] = value;
  }
  return customerPaginationQuerySchema.safeParse(entries);
}
