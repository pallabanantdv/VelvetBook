import "server-only";
import { eq, sql } from "drizzle-orm";
import { onboardingEvidence, onboardingWorkflows } from "@/db/schema";
import type { FeatureSection } from "@/modules/onboarding/application/lifecycle.server";
import { WorkflowFailure, type WorkflowDatabase } from "./transaction.server";

/** Inject into the owning module's trusted transaction. Never construct evidence from HTTP progress claims. */
export function moduleCompletionWriter(db: WorkflowDatabase, section: FeatureSection) {
  return async (evidence: { organizationId: string; storeId: string; progress: "not_started" | "in_progress" | "complete" | "not_applicable"; sourceRevision: number; fingerprint: string; expiresAt: Date }) => {
    if (!Number.isInteger(evidence.sourceRevision) || evidence.sourceRevision < 1 || !/^[0-9a-f]{64}$/.test(evidence.fingerprint) ||
      evidence.expiresAt <= new Date() || evidence.expiresAt.getTime() > Date.now() + 86400000 ||
      (evidence.progress === "not_applicable" && section !== "products")) throw new WorkflowFailure("validation");
    await db.transaction(async (tx) => {
      const [workflow] = await tx.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.organizationId, evidence.organizationId)).for("update");
      if (!workflow) throw new WorkflowFailure("not_found");
      const [record] = await tx.insert(onboardingEvidence).values({ ...evidence, section }).onConflictDoUpdate({
        target: [onboardingEvidence.organizationId, onboardingEvidence.storeId, onboardingEvidence.section],
        set: { progress: evidence.progress, sourceRevision: evidence.sourceRevision, fingerprint: evidence.fingerprint, expiresAt: evidence.expiresAt, updatedAt: new Date() },
        setWhere: sql`${onboardingEvidence.sourceRevision} < ${evidence.sourceRevision} OR
          (${onboardingEvidence.sourceRevision} = ${evidence.sourceRevision} AND ${onboardingEvidence.fingerprint} = ${evidence.fingerprint} AND ${onboardingEvidence.progress} = ${evidence.progress})`,
      }).returning();
      if (!record) throw new WorkflowFailure("conflict");
    });
  };
}
