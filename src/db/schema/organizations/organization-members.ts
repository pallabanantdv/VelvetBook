import "server-only";

import { sql } from "drizzle-orm";
import { check, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../common";
import { users } from "../identity/users";
import { organizations } from "./organizations";

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role", { enum: ["owner", "manager", "staff", "member"] })
      .default("member")
      .notNull(),
    status: text("status", { enum: ["active", "suspended", "revoked"] })
      .default("active")
      .notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("members_org_user_unique").on(t.organizationId, t.userId),
    unique("members_org_id_unique").on(t.organizationId, t.id),
    index("members_user_idx").on(t.userId),
    check(
      "members_role_check",
      sql`${t.role} in ('owner', 'manager', 'staff', 'member')`,
    ),
    check(
      "members_status_check",
      sql`${t.status} in ('active', 'suspended', 'revoked')`,
    ),
  ],
);
