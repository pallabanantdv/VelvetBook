import "server-only";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { onboardingWorkflows, onboardingStores, onboardingEvidence, onboardingSubmissions, onboardingDecisions, organizations, organizationMembers, stores } from "@/db/schema";
import type { OnboardingRuntimePort, OnboardingCommand, AdminOnboardingCommand } from "../application/runtime.server";
import { completionProgress, requireTransition, sectionOrder } from "../application/lifecycle.server";
import { requireActor, replayRequest, rememberRequest, appendWorkflowAudit, fingerprint, WorkflowFailure,
  type WorkflowDatabase, type WorkflowTransaction, type WorkflowActor } from "@/infrastructure/onboarding/transaction.server";

type Workflow = typeof onboardingWorkflows.$inferSelect;
async function plan(tx: WorkflowTransaction, workflow: Workflow) {
  const [organization] = await tx.select().from(organizations).where(eq(organizations.id, workflow.organizationId)).limit(1);
  const selected = await tx.select({ id: onboardingStores.storeId }).from(onboardingStores).where(and(eq(onboardingStores.workflowId, workflow.id), eq(onboardingStores.selected, true))).orderBy(onboardingStores.storeId);
  const ids = selected.map((row) => row.id);
  const selectedStores = ids.length ? await tx.select().from(stores).where(and(eq(stores.organizationId, workflow.organizationId), inArray(stores.id, ids))).orderBy(stores.id) : [];
  const evidence = ids.length ? await tx.select().from(onboardingEvidence).where(and(eq(onboardingEvidence.organizationId, workflow.organizationId), inArray(onboardingEvidence.storeId, ids))).orderBy(onboardingEvidence.section, onboardingEvidence.storeId) : [];
  const snapshot = {
    organization: { id: organization.id, name: organization.name, slug: organization.slug, revision: organization.revision },
    stores: selectedStores.map((store) => ({ id: store.id, name: store.name, slug: store.slug, timezone: store.timezone, address: store.address, revision: store.revision, archived: store.archivedAt !== null })),
    evidence: evidence.map((row) => ({ storeId: row.storeId, section: row.section, progress: row.progress, sourceRevision: row.sourceRevision, fingerprint: row.fingerprint })),
  };
  const hash = fingerprint(snapshot);
  const readiness = completionProgress({ selectedStores: ids.length, validStores: selectedStores.filter((store) => store.archivedAt === null).length,
    evidence, storeIds: ids, confirmed: workflow.confirmedFingerprint === hash, now: new Date() });
  return { ...readiness, snapshot, fingerprint: hash, selectedStoreIds: ids };
}
async function view(tx: WorkflowTransaction, workflow: Workflow) {
  const current = await plan(tx, workflow);
  const [submission] = await tx.select().from(onboardingSubmissions).where(and(eq(onboardingSubmissions.organizationId, workflow.organizationId), eq(onboardingSubmissions.workflowId, workflow.id))).orderBy(desc(onboardingSubmissions.revision)).limit(1);
  const [decision] = submission ? await tx.select().from(onboardingDecisions).where(and(eq(onboardingDecisions.submissionId, submission.id), eq(onboardingDecisions.organizationId, workflow.organizationId), isNotNull(onboardingDecisions.appliedAt))).orderBy(desc(onboardingDecisions.appliedAt)).limit(1) : [];
  return { id: workflow.id, organizationId: workflow.organizationId, state: workflow.state, revision: workflow.revision,
    selectedStoreIds: current.selectedStoreIds, sectionProgress: workflow.state === "draft" ? current.sectionProgress : submission?.snapshot.sectionProgress ?? current.sectionProgress,
    currentReadiness: current.sectionProgress, currentSection: current.currentSection, readyToSubmit: workflow.state === "draft" && current.ready,
    blockedSections: sectionOrder.filter((section) => !["complete", "not_applicable"].includes(current.sectionProgress[section])),
    submissionId: submission?.id ?? null, submittedAt: submission?.createdAt.toISOString() ?? null,
    lastReview: decision?.appliedAt ? { decision: decision.decision, reason: decision.decision === "rejected" ? decision.reason : null, decidedAt: decision.appliedAt.toISOString() } : null,
    updatedAt: workflow.updatedAt.toISOString() };
}
async function workflowFor(tx: WorkflowTransaction, organizationId: string, write: boolean) {
  const query = tx.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.organizationId, organizationId));
  const [workflow] = write ? await query.for("update") : await query.for("share");
  if (!workflow) throw new WorkflowFailure("not_found"); return workflow;
}
async function independent(tx: WorkflowTransaction, userId: string, workflow: Workflow, submittedBy: string) {
  const [member] = await tx.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, workflow.organizationId), eq(organizationMembers.userId, userId))).limit(1);
  if (member || workflow.creatorUserId === userId || submittedBy === userId) throw new WorkflowFailure("forbidden");
}
export class DrizzleOnboardingWorkflow implements OnboardingRuntimePort {
  constructor(readonly db: WorkflowDatabase, readonly actor: WorkflowActor) {}
  async read(id: string) {
    return this.db.transaction(async (tx) => {
      await requireActor(tx, this.actor, { organization: { id, permission: { scope: "organization", resource: "onboarding", action: "read" } } });
      return view(tx, await workflowFor(tx, id, false));
    });
  }
  async execute(id: string, command: OnboardingCommand, key: string) {
    return this.db.transaction(async (tx) => {
      await requireActor(tx, this.actor, { organization: { id, permission: { scope: "organization", resource: "onboarding", action: command.kind === "submit" ? "submit" : "update" } } });
      const operation = "onboarding." + command.kind;
      const replay = await replayRequest(tx, this.actor, operation, key, { organizationId: id, ...command });
      if (replay.previous) return replay.previous;
      const workflow = await workflowFor(tx, id, true);
      if (workflow.revision !== command.expectedRevision) throw new WorkflowFailure("conflict");
      let state = workflow.state; let confirmation = workflow.confirmedFingerprint; let submissionId: string | undefined;
      if (command.kind === "reopen") { requireTransition(state, "draft"); state = "draft"; confirmation = null; }
      else {
        if (state !== "draft") throw new WorkflowFailure("conflict");
        if (command.kind === "select-stores") {
          const selected = await tx.select().from(stores).where(and(eq(stores.organizationId, id), inArray(stores.id, command.selectedStoreIds)));
          if (selected.length !== command.selectedStoreIds.length || selected.some((store) => store.archivedAt)) throw new WorkflowFailure("forbidden");
          // Keep historical selection rows; switching stores never deletes data.
          await tx.update(onboardingStores).set({ selected: false, updatedAt: new Date() }).where(eq(onboardingStores.workflowId, workflow.id));
          for (const storeId of command.selectedStoreIds) await tx.insert(onboardingStores).values({ organizationId: id, workflowId: workflow.id, storeId })
            .onConflictDoUpdate({ target: [onboardingStores.organizationId, onboardingStores.workflowId, onboardingStores.storeId], set: { selected: true, updatedAt: new Date() } });
          confirmation = null;
        } else {
          const current = await plan(tx, workflow);
          if (sectionOrder.slice(0, -1).some((section) => !["complete", "not_applicable"].includes(current.sectionProgress[section]))) throw new WorkflowFailure("conflict");
          if (command.kind === "confirm-review") confirmation = current.fingerprint;
          else {
            if (!current.ready) throw new WorkflowFailure("conflict");
            requireTransition(state, "submitted"); state = "submitted";
            const [submission] = await tx.insert(onboardingSubmissions).values({ organizationId: id, workflowId: workflow.id, revision: workflow.revision,
              fingerprint: current.fingerprint, snapshot: { ...current.snapshot, sectionProgress: current.sectionProgress }, submittedByUserId: this.actor.userId }).returning();
            submissionId = submission.id;
          }
        }
      }
      const [updated] = await tx.update(onboardingWorkflows).set({ state, confirmedFingerprint: confirmation, revision: workflow.revision + 1, updatedAt: new Date() }).where(eq(onboardingWorkflows.id, workflow.id)).returning();
      const response = await view(tx, updated);
      await appendWorkflowAudit(tx, this.actor, id, operation, workflow.id, { revision: updated.revision, ...(submissionId ? { submissionId } : {}) });
      await rememberRequest(tx, this.actor, id, operation, key, replay.hash, response); return response;
    });
  }
  async readCase(submissionId: string) {
    return this.db.transaction(async (tx) => {
      await requireActor(tx, this.actor, { platform: { scope: "platform", resource: "onboarding", action: "read" } });
      const [submission] = await tx.select().from(onboardingSubmissions).where(eq(onboardingSubmissions.id, submissionId)).limit(1);
      if (!submission) throw new WorkflowFailure("not_found");
      const workflow = await workflowFor(tx, submission.organizationId, false);
      return { ...await view(tx, workflow), requestedSubmission: { id: submission.id, fingerprint: submission.fingerprint, revision: submission.revision, snapshot: submission.snapshot } };
    });
  }
  async review(submissionId: string, command: AdminOnboardingCommand, key: string) {
    return this.db.transaction(async (tx) => {
      await requireActor(tx, this.actor, { platform: { scope: "platform", resource: "onboarding", action: "review" }, reauthenticate: command.kind !== "start-review" });
      const operation = "onboarding.admin." + command.kind;
      const replay = await replayRequest(tx, this.actor, operation, key, { submissionId, ...command });
      if (replay.previous) return replay.previous;
      const [submission] = await tx.select().from(onboardingSubmissions).where(eq(onboardingSubmissions.id, submissionId)).limit(1);
      if (!submission) throw new WorkflowFailure("not_found");
      const workflow = await workflowFor(tx, submission.organizationId, true);
      const [latest] = await tx.select({ id: onboardingSubmissions.id }).from(onboardingSubmissions).where(eq(onboardingSubmissions.workflowId, workflow.id)).orderBy(desc(onboardingSubmissions.revision)).limit(1);
      await independent(tx, this.actor.userId, workflow, submission.submittedByUserId);
      if (workflow.revision !== command.expectedRevision || latest?.id !== submission.id) throw new WorkflowFailure("conflict");
      let response: Record<string, unknown>;
      if (command.kind === "propose") {
        if (workflow.state !== "under_review") throw new WorkflowFailure("conflict");
        const current = await plan(tx, workflow);
        if (command.decision === "approved" && (current.fingerprint !== submission.fingerprint || !current.ready)) throw new WorkflowFailure("conflict");
        const [decision] = await tx.insert(onboardingDecisions).values({ organizationId: workflow.organizationId, submissionId,
          proposerUserId: this.actor.userId, proposerSessionId: this.actor.sessionId, decision: command.decision, reason: command.reason,
          expectedRevision: workflow.revision, fingerprint: submission.fingerprint, expiresAt: new Date(Date.now() + 900000) }).returning();
        response = { decisionId: decision.id, submissionId, decision: decision.decision, expiresAt: decision.expiresAt.toISOString(), state: "proposed", expectedRevision: workflow.revision };
        await appendWorkflowAudit(tx, this.actor, workflow.organizationId, "onboarding.decision.prepared", workflow.id, { submissionId, decisionId: decision.id, fingerprint: decision.fingerprint, revision: workflow.revision });
      } else {
        let state = workflow.state;
        if (command.kind === "start-review") { requireTransition(state, "under_review"); state = "under_review"; }
        else {
          const [decision] = await tx.select().from(onboardingDecisions).where(and(eq(onboardingDecisions.id, command.decisionId), eq(onboardingDecisions.submissionId, submissionId), eq(onboardingDecisions.organizationId, workflow.organizationId))).for("update");
          if (!decision || decision.appliedAt || decision.expiresAt <= new Date() || decision.expectedRevision !== workflow.revision || decision.fingerprint !== submission.fingerprint) throw new WorkflowFailure("conflict");
          if (decision.proposerUserId === this.actor.userId) throw new WorkflowFailure("forbidden");
          await requireActor(tx, { ...this.actor, sessionId: decision.proposerSessionId, userId: decision.proposerUserId }, { platform: { scope: "platform", resource: "onboarding", action: "review" } });
          await independent(tx, decision.proposerUserId, workflow, submission.submittedByUserId);
          const current = await plan(tx, workflow);
          if (decision.decision === "approved" && (current.fingerprint !== submission.fingerprint || !current.ready)) throw new WorkflowFailure("conflict");
          requireTransition(state, decision.decision); state = decision.decision;
          await tx.update(onboardingDecisions).set({ appliedAt: new Date(), appliedByUserId: this.actor.userId, updatedAt: new Date() }).where(eq(onboardingDecisions.id, decision.id));
        }
        const [updated] = await tx.update(onboardingWorkflows).set({ state, revision: workflow.revision + 1, updatedAt: new Date() }).where(eq(onboardingWorkflows.id, workflow.id)).returning();
        response = await view(tx, updated);
        await appendWorkflowAudit(tx, this.actor, workflow.organizationId, operation, workflow.id, { submissionId, revision: updated.revision, fingerprint: submission.fingerprint });
      }
      await rememberRequest(tx, this.actor, workflow.organizationId, operation, key, replay.hash, response); return response;
    });
  }
}
