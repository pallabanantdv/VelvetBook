import "server-only";

import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { bookings } from "../bookings/bookings";
import { timestamps } from "../common";

/** Proposed attempts and refund summary; refund/outbox/inbox ledgers are deferred. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    bookingId: uuid("booking_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    status: text("status", {
      enum: ["initiating", "pending", "succeeded", "failed", "cancelled"],
    })
      .default("initiating")
      .notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerAccountRef: varchar("provider_account_ref", {
      length: 128,
    }).notNull(),
    refundStatus: text("refund_status", {
      enum: ["none", "pending", "partially_refunded", "refunded", "failed"],
    })
      .default("none")
      .notNull(),
    requestFingerprint: varchar("request_fingerprint", {
      length: 64,
    }).notNull(),
    revision: integer("revision").default(1).notNull(),
    providerPaymentId: text("provider_payment_id"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    ...timestamps(),
  },
  (t) => [
    check("payments_revision_check", sql`${t.revision} > 0`),
    check(
      "payments_fingerprint_check",
      sql`${t.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "payments_refund_status_check",
      sql`${t.refundStatus} in ('none','pending','partially_refunded','refunded','failed')`,
    ),
    unique("payments_org_idempotency_unique").on(
      t.organizationId,
      t.idempotencyKey,
    ),
    unique("payments_provider_reference_unique").on(
      t.provider,
      t.providerAccountRef,
      t.providerPaymentId,
    ),
    index("payments_booking_idx").on(t.organizationId, t.bookingId, t.currency),
    foreignKey({
      name: "payments_booking_currency_fk",
      columns: [t.organizationId, t.bookingId, t.currency],
      foreignColumns: [bookings.organizationId, bookings.id, bookings.currency],
    }).onDelete("restrict"),
    check(
      "payments_amount_check",
      sql`${t.amount} > 0 and ${t.amount} <> 'NaN'::numeric`,
    ),
    check("payments_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check(
      "payments_status_check",
      sql`${t.status} in ('initiating', 'pending', 'succeeded', 'failed', 'cancelled')`,
    ),
  ],
);
