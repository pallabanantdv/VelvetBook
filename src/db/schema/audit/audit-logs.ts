import "server-only";

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../identity/users";
import { organizations } from "../organizations/organizations";

/** Proposed append-only convention; database grants/triggers are deferred. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("audit_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_actor_created_idx").on(t.actorUserId, t.createdAt),
    index("audit_subject_idx").on(t.organizationId, t.subjectType, t.subjectId),
  ],
);
