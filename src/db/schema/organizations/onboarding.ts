import "server-only";
import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, unique, index, check, foreignKey } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { stores } from "./stores";
import { users } from "../identity/users";
import { authSessions } from "../identity/authentication";
import { timestamps } from "../common";

export const onboardingWorkflows = pgTable("onboarding_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  creatorUserId: uuid("creator_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  state: text("state", { enum: ["draft", "submitted", "under_review", "approved", "rejected"] }).default("draft").notNull(),
  revision: integer("revision").default(1).notNull(),
  confirmedFingerprint: text("confirmed_fingerprint"),
  ...timestamps(),
}, (t) => [unique("onboarding_organization_unique").on(t.organizationId), unique("onboarding_org_id_unique").on(t.organizationId, t.id),
  index("onboarding_creator_idx").on(t.creatorUserId), check("onboarding_revision_check", sql`${t.revision} > 0`),
  check("onboarding_state_check", sql`${t.state} in ('draft','submitted','under_review','approved','rejected')`),
  check("onboarding_confirmation_check", sql`${t.confirmedFingerprint} is null or ${t.confirmedFingerprint} ~ '^[0-9a-f]{64}$'`)]);

export const onboardingStores = pgTable("onboarding_stores", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(),
  workflowId: uuid("workflow_id").notNull(), storeId: uuid("store_id").notNull(), selected: boolean("selected").default(true).notNull(), ...timestamps(),
}, (t) => [unique("onboarding_selected_store_unique").on(t.organizationId, t.workflowId, t.storeId), index("onboarding_selected_store_idx").on(t.organizationId, t.storeId),
  foreignKey({ name: "onboarding_selection_workflow_fk", columns: [t.organizationId, t.workflowId], foreignColumns: [onboardingWorkflows.organizationId, onboardingWorkflows.id] }).onDelete("restrict"),
  foreignKey({ name: "onboarding_selection_store_fk", columns: [t.organizationId, t.storeId], foreignColumns: [stores.organizationId, stores.id] }).onDelete("restrict")]);

export const onboardingEvidence = pgTable("onboarding_evidence", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), storeId: uuid("store_id").notNull(),
  section: text("section", { enum: ["photos", "services", "products", "staff", "visibility"] }).notNull(),
  progress: text("progress", { enum: ["not_started", "in_progress", "complete", "not_applicable"] }).notNull(),
  sourceRevision: integer("source_revision").notNull(), fingerprint: text("fingerprint").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), ...timestamps(),
}, (t) => [unique("onboarding_evidence_source_unique").on(t.organizationId, t.storeId, t.section),
  foreignKey({ name: "onboarding_evidence_store_fk", columns: [t.organizationId, t.storeId], foreignColumns: [stores.organizationId, stores.id] }).onDelete("restrict"),
  check("onboarding_evidence_revision_check", sql`${t.sourceRevision} > 0`), check("onboarding_evidence_hash_check", sql`${t.fingerprint} ~ '^[0-9a-f]{64}$'`),
  check("onboarding_evidence_section_check", sql`${t.section} in ('photos','services','products','staff','visibility')`),
  check("onboarding_evidence_progress_check", sql`${t.progress} in ('not_started','in_progress','complete','not_applicable') and (${t.progress} <> 'not_applicable' or ${t.section} = 'products')`)]);

export const onboardingSubmissions = pgTable("onboarding_submissions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workflowId: uuid("workflow_id").notNull(),
  revision: integer("revision").notNull(), fingerprint: text("fingerprint").notNull(), snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  submittedByUserId: uuid("submitted_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }), ...timestamps(),
}, (t) => [unique("submission_org_id_unique").on(t.organizationId, t.id), unique("submission_revision_unique").on(t.organizationId, t.workflowId, t.revision),
  index("submission_actor_idx").on(t.submittedByUserId),
  foreignKey({ name: "submission_workflow_fk", columns: [t.organizationId, t.workflowId], foreignColumns: [onboardingWorkflows.organizationId, onboardingWorkflows.id] }).onDelete("restrict"),
  check("submission_revision_check", sql`${t.revision} > 0`), check("submission_fingerprint_check", sql`${t.fingerprint} ~ '^[0-9a-f]{64}$'`), check("submission_snapshot_check", sql`jsonb_typeof(${t.snapshot}) = 'object'`)]);

export const onboardingDecisions = pgTable("onboarding_decisions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), submissionId: uuid("submission_id").notNull(),
  proposerUserId: uuid("proposer_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  proposerSessionId: uuid("proposer_session_id").notNull().references(() => authSessions.id, { onDelete: "restrict" }),
  appliedByUserId: uuid("applied_by_user_id").references(() => users.id, { onDelete: "restrict" }),
  decision: text("decision", { enum: ["approved", "rejected"] }).notNull(), reason: text("reason").notNull(),
  expectedRevision: integer("expected_revision").notNull(), fingerprint: text("fingerprint").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), appliedAt: timestamp("applied_at", { withTimezone: true }), ...timestamps(),
}, (t) => [index("decision_submission_idx").on(t.organizationId, t.submissionId), index("decision_proposer_idx").on(t.proposerUserId), index("decision_proposer_session_idx").on(t.proposerSessionId), index("decision_applier_idx").on(t.appliedByUserId),
  foreignKey({ name: "decision_submission_fk", columns: [t.organizationId, t.submissionId], foreignColumns: [onboardingSubmissions.organizationId, onboardingSubmissions.id] }).onDelete("restrict"),
  check("decision_kind_check", sql`${t.decision} in ('approved','rejected')`), check("decision_reason_check", sql`length(btrim(${t.reason})) between 1 and 4000`),
  check("decision_independence_check", sql`${t.appliedByUserId} is null or ${t.appliedByUserId} <> ${t.proposerUserId}`),
  check("decision_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`), check("decision_fingerprint_check", sql`${t.fingerprint} ~ '^[0-9a-f]{64}$'`),
  check("decision_application_check", sql`(${t.appliedAt} is null) = (${t.appliedByUserId} is null)`)]);

export const onboardingRequests = pgTable("onboarding_requests", {
  id: uuid("id").defaultRandom().primaryKey(), actorUserId: uuid("actor_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  operation: text("operation").notNull(), idempotencyKey: text("idempotency_key").notNull(), fingerprint: text("fingerprint").notNull(),
  response: jsonb("response").$type<Record<string, unknown>>().notNull(), ...timestamps(),
}, (t) => [unique("onboarding_request_unique").on(t.actorUserId, t.operation, t.idempotencyKey), index("onboarding_request_org_idx").on(t.organizationId),
  check("onboarding_request_key_check", sql`length(${t.idempotencyKey}) between 1 and 128`),
  check("onboarding_request_hash_check", sql`${t.fingerprint} ~ '^[0-9a-f]{64}$'`), check("onboarding_response_check", sql`jsonb_typeof(${t.response}) = 'object'`)]);
