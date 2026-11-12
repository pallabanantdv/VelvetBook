import "server-only";

import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { bookings } from "../bookings/bookings";
import { timestamps } from "../common";

/** Proposed: multiple payment attempts per booking, no refund/ledger model yet. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    bookingId: uuid("booking_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "cancelled"],
    })
      .default("pending")
      .notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerPaymentId: text("provider_payment_id"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("payments_org_idempotency_unique").on(
      t.organizationId,
      t.idempotencyKey,
    ),
    unique("payments_provider_reference_unique").on(
      t.provider,
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
      sql`${t.status} in ('pending', 'succeeded', 'failed', 'cancelled')`,
    ),
  ],
);
