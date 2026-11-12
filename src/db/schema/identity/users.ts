import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    displayName: text("display_name").notNull(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("users_email_ci_uidx").on(sql`lower(${t.email})`),
    check(
      "users_email_trimmed_check",
      sql`${t.email} = btrim(${t.email}) and length(${t.email}) > 0`,
    ),
  ],
);
