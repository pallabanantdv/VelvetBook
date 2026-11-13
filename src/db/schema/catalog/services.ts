import "server-only";

import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { stores } from "../organizations/stores";

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    revision: integer("revision").default(1).notNull(),
    price: numeric("price", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check("services_revision_check", sql`${t.revision} > 0`),
    unique("services_org_store_id_unique").on(
      t.organizationId,
      t.storeId,
      t.id,
    ),
    foreignKey({
      name: "services_store_fk",
      columns: [t.organizationId, t.storeId],
      foreignColumns: [stores.organizationId, stores.id],
    }).onDelete("restrict"),
    check("services_duration_check", sql`${t.durationMinutes} > 0`),
    check(
      "services_price_check",
      sql`${t.price} >= 0 and ${t.price} <> 'NaN'::numeric`,
    ),
    check("services_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);
