import "server-only";

import { sql } from "drizzle-orm";
import {
  char,
  check,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { organizations } from "../organizations/organizations";

/** Proposed: an organization-wide code; no product/service eligibility model yet. */
export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 64 }).notNull(),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["percentage", "fixed"] }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currency: char("currency", { length: 3 }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("deals_org_id_unique").on(t.organizationId, t.id),
    unique("deals_org_code_unique").on(t.organizationId, t.code),
    check("deals_code_check", sql`${t.code} ~ '^[A-Z0-9_-]+$'`),
    check(
      "deals_window_check",
      sql`${t.endsAt} is null or ${t.endsAt} > ${t.startsAt}`,
    ),
    check(
      "deals_value_check",
      sql`(
    ${t.kind} = 'percentage' and ${t.percentage} is not null and ${t.percentage} > 0 and ${t.percentage} <= 100 and ${t.amount} is null and ${t.currency} is null
  ) or (
    ${t.kind} = 'fixed' and ${t.amount} is not null and ${t.amount} > 0 and ${t.amount} <> 'NaN'::numeric and ${t.currency} is not null and ${t.currency} ~ '^[A-Z]{3}$' and ${t.percentage} is null
  )`,
    ),
  ],
);
