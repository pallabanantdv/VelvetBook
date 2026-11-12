import "server-only";
import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { users } from "./users";

export const customerProfiles = pgTable(
  "customer_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    locale: text("locale").notNull(),
    timezone: text("timezone"),
    revision: integer("revision").default(1).notNull(),
    ...timestamps(),
  },
  (t) => [unique("customer_profiles_user_unique").on(t.userId)],
);
