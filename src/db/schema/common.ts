import "server-only";

import { timestamp } from "drizzle-orm/pg-core";

/** Fresh column builders per table; updated_at requires an explicit future write. */
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
