import "server-only";

import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { stores } from "../organizations/stores";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("products_org_store_id_unique").on(
      t.organizationId,
      t.storeId,
      t.id,
    ),
    unique("products_store_sku_unique").on(t.organizationId, t.storeId, t.sku),
    foreignKey({
      name: "products_store_fk",
      columns: [t.organizationId, t.storeId],
      foreignColumns: [stores.organizationId, stores.id],
    }).onDelete("restrict"),
    check(
      "products_price_check",
      sql`${t.price} >= 0 and ${t.price} <> 'NaN'::numeric`,
    ),
    check("products_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);
