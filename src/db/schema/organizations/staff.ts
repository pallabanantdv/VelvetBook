import "server-only";
import { sql } from "drizzle-orm";

import {
  foreignKey,
  check,
  integer,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { organizationMembers } from "./organization-members";
import { stores } from "./stores";

/** Proposed: one store assignment per organization member per store. */
export const staff = pgTable(
  "staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    organizationMemberId: uuid("organization_member_id").notNull(),
    revision: integer("revision").default(1).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check("staff_revision_check", sql`${t.revision} > 0`),
    unique("staff_org_store_id_unique").on(t.organizationId, t.storeId, t.id),
    unique("staff_store_member_unique").on(
      t.organizationId,
      t.storeId,
      t.organizationMemberId,
    ),
    index("staff_member_idx").on(t.organizationId, t.organizationMemberId),
    foreignKey({
      name: "staff_store_fk",
      columns: [t.organizationId, t.storeId],
      foreignColumns: [stores.organizationId, stores.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "staff_member_fk",
      columns: [t.organizationId, t.organizationMemberId],
      foreignColumns: [
        organizationMembers.organizationId,
        organizationMembers.id,
      ],
    }).onDelete("restrict"),
  ],
);
