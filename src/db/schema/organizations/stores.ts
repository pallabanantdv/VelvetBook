import "server-only";

import {
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { organizations } from "./organizations";

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    timezone: text("timezone").notNull(),
    address: text("address"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("stores_org_id_unique").on(t.organizationId, t.id),
    unique("stores_org_slug_unique").on(t.organizationId, t.slug),
  ],
);
