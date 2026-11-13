import "server-only";
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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
    phone: text("phone"),
    avatarReference: text("avatar_reference"),
    preferences: jsonb("preferences").$type<{ theme: "system" | "light" | "dark"; bookingReminders: boolean }>()
      .default({ theme: "system", bookingReminders: true }).notNull(),
    revision: integer("revision").default(1).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("customer_profiles_user_unique").on(t.userId),
    check("customer_profiles_revision_check", sql`${t.revision} > 0`),
    check("customer_profiles_phone_check", sql`${t.phone} is null or ${t.phone} ~ '^\+[1-9][0-9]{6,14}$'`),
    check("customer_profiles_avatar_check", sql`${t.avatarReference} is null or (length(${t.avatarReference}) <= 128 and ${t.avatarReference} ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$')`),
    check("customer_profiles_preferences_check", sql`jsonb_typeof(${t.preferences}) = 'object'
      and ${t.preferences} ?& array['theme','bookingReminders']
      and (${t.preferences} - 'theme' - 'bookingReminders') = '{}'::jsonb
      and jsonb_typeof(${t.preferences}->'theme') = 'string'
      and ${t.preferences}->>'theme' in ('system','light','dark')
      and jsonb_typeof(${t.preferences}->'bookingReminders') = 'boolean'`),
  ],
);
