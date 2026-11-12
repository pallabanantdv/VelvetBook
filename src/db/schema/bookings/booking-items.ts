import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { products } from "../catalog/products";
import { services } from "../catalog/services";
import { staff } from "../organizations/staff";
import { bookings } from "./bookings";

/** Proposed: mixed service/product lines, with one optional staff assignment per service. */
export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    bookingId: uuid("booking_id").notNull(),
    kind: text("kind", { enum: ["service", "product"] }).notNull(),
    serviceId: uuid("service_id"),
    productId: uuid("product_id"),
    staffId: uuid("staff_id"),
    nameSnapshot: text("name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    durationMinutes: integer("duration_minutes"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("items_org_store_booking_id_unique").on(
      t.organizationId,
      t.storeId,
      t.bookingId,
      t.id,
    ),
    index("items_staff_window_idx").on(
      t.organizationId,
      t.storeId,
      t.staffId,
      t.startsAt,
      t.endsAt,
    ),
    check(
      "items_window_check",
      sql`(
      ${t.kind} = 'service' and ${t.startsAt} is not null and ${t.endsAt} is not null and ${t.endsAt} > ${t.startsAt}
    ) or (${t.kind} = 'product' and ${t.startsAt} is null and ${t.endsAt} is null)`,
    ),
    index("items_booking_idx").on(t.organizationId, t.storeId, t.bookingId),
    index("items_service_idx").on(t.organizationId, t.storeId, t.serviceId),
    index("items_product_idx").on(t.organizationId, t.storeId, t.productId),
    index("items_staff_idx").on(t.organizationId, t.storeId, t.staffId),
    foreignKey({
      name: "items_booking_fk",
      columns: [t.organizationId, t.storeId, t.bookingId],
      foreignColumns: [bookings.organizationId, bookings.storeId, bookings.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "items_service_fk",
      columns: [t.organizationId, t.storeId, t.serviceId],
      foreignColumns: [services.organizationId, services.storeId, services.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "items_product_fk",
      columns: [t.organizationId, t.storeId, t.productId],
      foreignColumns: [products.organizationId, products.storeId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "items_staff_fk",
      columns: [t.organizationId, t.storeId, t.staffId],
      foreignColumns: [staff.organizationId, staff.storeId, staff.id],
    }).onDelete("restrict"),
    check(
      "items_kind_check",
      sql`(
    ${t.kind} = 'service' and ${t.serviceId} is not null and ${t.productId} is null and ${t.quantity} = 1 and ${t.durationMinutes} is not null and ${t.durationMinutes} > 0
  ) or (
    ${t.kind} = 'product' and ${t.productId} is not null and ${t.serviceId} is null and ${t.staffId} is null and ${t.durationMinutes} is null and ${t.quantity} > 0
  )`,
    ),
    check(
      "items_price_check",
      sql`${t.unitPrice} >= 0 and ${t.unitPrice} <> 'NaN'::numeric`,
    ),
  ],
);
