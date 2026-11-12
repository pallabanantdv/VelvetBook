import "server-only";

import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { deals } from "../commerce/deals";
import { users } from "../identity/users";
import { stores } from "../organizations/stores";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    customerUserId: uuid("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dealId: uuid("deal_id"),
    status: text("status", {
      enum: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "expired",
        "no_show",
      ],
    })
      .default("pending")
      .notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    revision: integer("revision").default(1).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    requestFingerprint: varchar("request_fingerprint", {
      length: 64,
    }).notNull(),
    policySnapshot: jsonb("policy_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("bookings_customer_request_unique").on(
      t.customerUserId,
      t.idempotencyKey,
    ),
    unique("bookings_org_store_id_customer_unique").on(
      t.organizationId,
      t.storeId,
      t.id,
      t.customerUserId,
    ),
    index("bookings_hold_expiry_idx").on(t.status, t.holdExpiresAt),
    check("bookings_revision_check", sql`${t.revision} > 0`),
    check(
      "bookings_request_check",
      sql`length(${t.idempotencyKey}) > 0 and ${t.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "bookings_policy_check",
      sql`jsonb_typeof(${t.policySnapshot}) = 'object'`,
    ),
    check(
      "bookings_hold_check",
      sql`${t.status} <> 'pending' or (${t.holdExpiresAt} is not null and ${t.holdExpiresAt} > ${t.createdAt})`,
    ),
    unique("bookings_org_store_id_unique").on(
      t.organizationId,
      t.storeId,
      t.id,
    ),
    unique("bookings_org_id_currency_unique").on(
      t.organizationId,
      t.id,
      t.currency,
    ),
    index("bookings_store_start_idx").on(
      t.organizationId,
      t.storeId,
      t.startsAt,
    ),
    index("bookings_customer_start_idx").on(t.customerUserId, t.startsAt),
    index("bookings_deal_idx").on(t.organizationId, t.dealId),
    foreignKey({
      name: "bookings_store_fk",
      columns: [t.organizationId, t.storeId],
      foreignColumns: [stores.organizationId, stores.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "bookings_deal_fk",
      columns: [t.organizationId, t.dealId],
      foreignColumns: [deals.organizationId, deals.id],
    }).onDelete("restrict"),
    check(
      "bookings_status_check",
      sql`${t.status} in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired', 'no_show')`,
    ),
    check("bookings_window_check", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "bookings_total_check",
      sql`${t.totalAmount} >= 0 and ${t.totalAmount} <> 'NaN'::numeric`,
    ),
    check("bookings_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);
