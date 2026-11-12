import "server-only";
import { foreignKey, index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { users } from "../identity/users";
import { stores } from "../organizations/stores";

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerUserId: uuid("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("favorites_customer_store_unique").on(
      t.customerUserId,
      t.organizationId,
      t.storeId,
    ),
    index("favorites_store_idx").on(t.organizationId, t.storeId),
    foreignKey({
      name: "favorites_store_fk",
      columns: [t.organizationId, t.storeId],
      foreignColumns: [stores.organizationId, stores.id],
    }).onDelete("restrict"),
  ],
);
