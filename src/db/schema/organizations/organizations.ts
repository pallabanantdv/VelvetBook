import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    revision: integer("revision").default(1).notNull(),
    status: text("status", { enum: ["active", "suspended", "closed"] })
      .default("active")
      .notNull(),
    ...timestamps(),
  },
  (t) => [
    check("organizations_revision_check", sql`${t.revision} > 0`),
    unique("organizations_slug_unique").on(t.slug),
    check(
      "organizations_slug_check",
      sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "organizations_status_check",
      sql`${t.status} in ('active', 'suspended', 'closed')`,
    ),
  ],
);
