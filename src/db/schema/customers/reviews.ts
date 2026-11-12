import "server-only";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { bookings } from "../bookings/bookings";
import { timestamps } from "../common";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    bookingId: uuid("booking_id").notNull(),
    customerUserId: uuid("customer_user_id").notNull(),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    status: text("status", {
      enum: ["pending", "published", "rejected", "withdrawn"],
    })
      .default("pending")
      .notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("reviews_booking_unique").on(t.organizationId, t.bookingId),
    index("reviews_booking_customer_idx").on(
      t.organizationId,
      t.storeId,
      t.bookingId,
      t.customerUserId,
    ),
    index("reviews_store_created_idx").on(
      t.organizationId,
      t.storeId,
      t.createdAt,
    ),
    foreignKey({
      name: "reviews_booking_customer_fk",
      columns: [t.organizationId, t.storeId, t.bookingId, t.customerUserId],
      foreignColumns: [
        bookings.organizationId,
        bookings.storeId,
        bookings.id,
        bookings.customerUserId,
      ],
    }).onDelete("restrict"),
    check("reviews_rating_check", sql`${t.rating} between 1 and 5`),
    check(
      "reviews_body_check",
      sql`length(btrim(${t.body})) between 1 and 5000`,
    ),
    check(
      "reviews_status_check",
      sql`${t.status} in ('pending','published','rejected','withdrawn')`,
    ),
  ],
);
