import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/db/client.server";
import { users, authSessions, authMfa, authCredentials, platformGrants, organizations, organizationMembers, onboardingRequests, auditLogs } from "@/db/schema";
import { hasPermission } from "@/modules/authorization/application/access.server";
import { MEMBERSHIP_ROLE_NAMES } from "@/modules/authorization/application/policy/role-permissions.server";
import type { OrganizationPermission, PlatformPermission } from "@/modules/authorization/application/public";

export type WorkflowDatabase = Omit<DatabaseClient["db"], "$client">;
export type WorkflowTransaction = Parameters<Parameters<WorkflowDatabase["transaction"]>[0]>[0];
export interface WorkflowActor { sessionId: string; userId: string; operationId: string; correlationId: string; reauthenticatedHash?: string }
export class WorkflowFailure extends Error {
  constructor(readonly category: "unauthenticated" | "forbidden" | "not_found" | "conflict" | "validation" | "unavailable") { super("Workflow operation failed."); }
}
export function fingerprint(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export async function requireActor(tx: WorkflowTransaction, actor: WorkflowActor, authority?: {
  platform?: PlatformPermission; organization?: { id: string; permission: OrganizationPermission }; reauthenticate?: boolean;
}) {
  const [user] = await tx.select().from(users).where(and(eq(users.id, actor.userId), isNull(users.disabledAt))).for("share");
  const [session] = await tx.select().from(authSessions).where(and(eq(authSessions.id, actor.sessionId), eq(authSessions.userId, actor.userId),
    isNull(authSessions.revokedAt), gt(authSessions.expiresAt, sql`now()`))).for("share");
  if (!user || !session) throw new WorkflowFailure("unauthenticated");
  if (authority?.platform) {
    const [grant] = await tx.select().from(platformGrants).where(and(eq(platformGrants.userId, user.id), eq(platformGrants.status, "active"))).for("share");
    const [factor] = await tx.select().from(authMfa).where(and(eq(authMfa.userId, user.id), eq(authMfa.confirmed, true))).for("share");
    if (!grant || !factor || !user.emailVerifiedAt || !session.mfaVerifiedAt || session.mfaVerifiedAt > new Date() ||
      Date.now() - session.mfaVerifiedAt.getTime() > 600000 || !hasPermission("platform_admin", authority.platform)) throw new WorkflowFailure("forbidden");
  }
  if (authority?.organization) {
    const { id, permission } = authority.organization;
    const [member] = await tx.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active"))).for("share");
    const [organization] = await tx.select().from(organizations).where(and(eq(organizations.id, id), eq(organizations.status, "active"))).limit(1);
    if (!member || !organization || !hasPermission(MEMBERSHIP_ROLE_NAMES[member.role], permission)) throw new WorkflowFailure("forbidden");
  }
  if (authority?.reauthenticate) {
    const [credential] = await tx.select().from(authCredentials).where(eq(authCredentials.userId, user.id)).limit(1);
    if (!credential || credential.passwordHash !== actor.reauthenticatedHash) throw new WorkflowFailure("forbidden");
  }
  return { user, session };
}
export async function replayRequest(tx: WorkflowTransaction, actor: WorkflowActor, operation: string, key: string, input: unknown) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${actor.userId}), hashtext(${operation + ":" + key}))`);
  const hash = fingerprint(input);
  const [request] = await tx.select().from(onboardingRequests).where(and(eq(onboardingRequests.actorUserId, actor.userId), eq(onboardingRequests.operation, operation), eq(onboardingRequests.idempotencyKey, key))).limit(1);
  if (request && request.fingerprint !== hash) throw new WorkflowFailure("conflict");
  return { hash, previous: request?.response, organizationId: request?.organizationId };
}
export async function rememberRequest(tx: WorkflowTransaction, actor: WorkflowActor, organizationId: string, operation: string, key: string, hash: string, response: Record<string, unknown>) {
  await tx.insert(onboardingRequests).values({ actorUserId: actor.userId, organizationId, operation, idempotencyKey: key, fingerprint: hash, response });
}
export async function appendWorkflowAudit(tx: WorkflowTransaction, actor: WorkflowActor, organizationId: string, action: string, subjectId: string, metadata: { revision?: number; submissionId?: string; fingerprint?: string; decisionId?: string }) {
  await tx.insert(auditLogs).values({ organizationId, actorUserId: actor.userId, action, subjectType: "onboarding", subjectId,
    metadata: { operationId: actor.operationId, correlationId: actor.correlationId, ...metadata } });
}
