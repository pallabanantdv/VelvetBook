import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/db/client.server";
import { authSessions, customerProfiles, users } from "@/db/schema";
import type { CustomerProfileRepository } from "../application/ports/contracts.server";
import { isSelfProfileContext } from "../application/profile.server";
import type { CustomerProfile } from "../domain/entities/model";

const denied = { ok: false as const, error: { code: "access_denied" as const, message: "Access denied." } };
const conflict = { ok: false as const, error: { code: "conflict" as const, message: "Profile revision changed." } };
const unavailable = { ok: false as const, error: { code: "unavailable" as const, message: "Profile storage unavailable." } };
function model(row: typeof customerProfiles.$inferSelect): CustomerProfile {
  return { ...row, id: row.id as CustomerProfile["id"], userId: row.userId as CustomerProfile["userId"] };
}

export class DrizzleCustomerProfiles implements CustomerProfileRepository {
  constructor(readonly db: DatabaseClient["db"]) {}
  async findSelf(context: Parameters<CustomerProfileRepository["findSelf"]>[0]) {
    if (!isSelfProfileContext(context, "read") && !isSelfProfileContext(context, "update")) return denied;
    try {
      const [row] = await this.db.select({ profile: customerProfiles }).from(authSessions)
        .innerJoin(users, eq(users.id, authSessions.userId))
        .leftJoin(customerProfiles, eq(customerProfiles.userId, users.id))
        .where(and(eq(authSessions.id, context.session.sessionId), eq(users.id, context.session.identity.userId),
          isNull(users.disabledAt), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, sql`now()`))).limit(1);
      if (!row) return denied;
      return { ok: true as const, value: row.profile ? model(row.profile) : null };
    } catch { return unavailable; }
  }
  async saveSelf(input: Parameters<CustomerProfileRepository["saveSelf"]>[0]) {
    const { context, profile, expectedRevision } = input;
    if (!isSelfProfileContext(context, "update") || profile.userId !== context.session.identity.userId ||
      profile.revision !== (expectedRevision ?? 0) + 1) return denied;
    try {
      return await this.db.transaction(async (tx) => {
        // Match recovery's user-before-session lock order. Revocation/disable cannot race the commit.
        const [user] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, context.session.identity.userId), isNull(users.disabledAt))).for("share");
        if (!user) return denied;
        const [session] = await tx.select({ id: authSessions.id }).from(authSessions).where(and(eq(authSessions.id, context.session.sessionId),
          eq(authSessions.userId, user.id), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, sql`now()`))).for("share");
        if (!session) return denied;
        // Never persist a spread of request/entity properties, even at an internal boundary.
        const fields = { displayName: profile.displayName, phone: profile.phone, avatarReference: profile.avatarReference,
          locale: profile.locale, timezone: profile.timezone,
          preferences: { theme: profile.preferences.theme, bookingReminders: profile.preferences.bookingReminders } };
        if (expectedRevision === null) {
          const [row] = await tx.insert(customerProfiles).values({ ...fields, id: profile.id, userId: user.id })
            .onConflictDoNothing({ target: customerProfiles.userId }).returning();
          return row ? { ok: true as const, value: model(row) } : conflict;
        }
        const [row] = await tx.update(customerProfiles).set({ ...fields, revision: sql`${customerProfiles.revision} + 1`, updatedAt: sql`now()` })
          .where(and(eq(customerProfiles.id, profile.id), eq(customerProfiles.userId, user.id), eq(customerProfiles.revision, expectedRevision))).returning();
        return row ? { ok: true as const, value: model(row) } : conflict;
      });
    } catch { return unavailable; }
  }
}
