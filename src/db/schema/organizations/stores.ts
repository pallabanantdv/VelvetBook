import "server-only";
import { sql } from "drizzle-orm";

import {
  pgTable,
  check,
  integer,
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
    revision: integer("revision").default(1).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    timezone: text("timezone").notNull(),
    address: text("address"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check("stores_revision_check", sql`${t.revision} > 0`),
    check("stores_slug_check", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("stores_timezone_check", sql`length(btrim(${t.timezone})) > 0`),
    unique("stores_org_id_unique").on(t.organizationId, t.id),
    unique("stores_org_slug_unique").on(t.organizationId, t.slug),
  ],
);
