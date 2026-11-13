import "server-only";
import { eq } from "drizzle-orm";
import { organizations, organizationMembers, onboardingWorkflows } from "@/db/schema";
import type { OrganizationBootstrapInput, OrganizationRuntimePort } from "../application/runtime.server";
import { requireActor, replayRequest, rememberRequest, appendWorkflowAudit, WorkflowFailure,
  type WorkflowDatabase, type WorkflowActor } from "@/infrastructure/onboarding/transaction.server";

export class DrizzleOrganizationDrafts implements OrganizationRuntimePort {
  constructor(readonly db: WorkflowDatabase, readonly actor: WorkflowActor) {}
  async create(input: OrganizationBootstrapInput, key: string) {
    try {
      return await this.db.transaction(async (tx) => {
        await requireActor(tx, this.actor);
        const replay = await replayRequest(tx, this.actor, "organization.create", key, input);
        if (replay.previous) {
          await requireActor(tx, this.actor, { organization: { id: replay.organizationId!, permission: { scope: "organization", resource: "organization", action: "read" } } });
          return replay.previous;
        }
        const [org] = await tx.insert(organizations).values(input).returning();
        await tx.insert(organizationMembers).values({ organizationId: org.id, userId: this.actor.userId, role: "owner" });
        const [workflow] = await tx.insert(onboardingWorkflows).values({ organizationId: org.id, creatorUserId: this.actor.userId }).returning();
        const response = { id: org.id, name: org.name, slug: org.slug, revision: org.revision, onboardingState: workflow.state, onboardingId: workflow.id };
        await appendWorkflowAudit(tx, this.actor, org.id, "onboarding.organization.created", workflow.id, { revision: 1 });
        await rememberRequest(tx, this.actor, org.id, "organization.create", key, replay.hash, response);
        return response;
      });
    } catch (error) {
      if (error instanceof WorkflowFailure) throw error;
      if ((error as { cause?: { code?: string }; code?: string }).cause?.code === "23505" || (error as { code?: string }).code === "23505") throw new WorkflowFailure("conflict");
      throw error;
    }
  }
  async read(id: string) {
    return this.db.transaction(async (tx) => {
      await requireActor(tx, this.actor, { organization: { id, permission: { scope: "organization", resource: "organization", action: "read" } } });
      const [org] = await tx.select().from(organizations).where(eq(organizations.id, id)).limit(1);
      const [workflow] = await tx.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.organizationId, id)).limit(1);
      if (!workflow) throw new WorkflowFailure("not_found");
      return { id: org.id, name: org.name, slug: org.slug, revision: org.revision, onboardingState: workflow.state, onboardingId: workflow.id };
    });
  }
  async update(id: string, input: Partial<OrganizationBootstrapInput> & { expectedRevision: number }, key: string) {
    return this.db.transaction(async (tx) => {
      await requireActor(tx, this.actor, { organization: { id, permission: { scope: "organization", resource: "organization", action: "update" } } });
      const replay = await replayRequest(tx, this.actor, "organization.update", key, { id, ...input });
      if (replay.previous) return replay.previous;
      const [workflow] = await tx.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.organizationId, id)).for("update");
      const [org] = await tx.select().from(organizations).where(eq(organizations.id, id)).for("update");
      if (!workflow || workflow.state !== "draft" || org.revision !== input.expectedRevision) throw new WorkflowFailure("conflict");
      const [updated] = await tx.update(organizations).set({ ...(input.name === undefined ? {} : { name: input.name }), ...(input.slug === undefined ? {} : { slug: input.slug }), revision: org.revision + 1, updatedAt: new Date() }).where(eq(organizations.id, id)).returning();
      await tx.update(onboardingWorkflows).set({ confirmedFingerprint: null, revision: workflow.revision + 1, updatedAt: new Date() }).where(eq(onboardingWorkflows.id, workflow.id));
      const response = { id, name: updated.name, slug: updated.slug, revision: updated.revision, onboardingState: workflow.state, onboardingId: workflow.id };
      await appendWorkflowAudit(tx, this.actor, id, "onboarding.organization.updated", workflow.id, { revision: updated.revision });
      await rememberRequest(tx, this.actor, id, "organization.update", key, replay.hash, response); return response;
    });
  }
}
