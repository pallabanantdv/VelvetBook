import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/db/client.server";
import {
  users,
  authCredentials,
  authSessions,
  authPasswordResets,
  authResetDeliveries,
  authRateLimits,
  authMfa,
} from "@/db/schema";
import type {
  AuthSession,
  AuthUser,
  IdentityStore,
} from "../application/ports/runtime.server";

function userView(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    emailVerified: row.emailVerifiedAt !== null,
  };
}
export class PostgresIdentityStore implements IdentityStore {
  constructor(readonly db: DatabaseClient["db"]) {}
  async register(email: string, displayName: string, passwordHash: string) {
    await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email, displayName })
        .onConflictDoNothing()
        .returning();
      if (user)
        await tx
          .insert(authCredentials)
          .values({ userId: user.id, passwordHash });
    });
  }
  async credential(email: string) {
    const [row] = await this.db
      .select({ user: users, hash: authCredentials.passwordHash })
      .from(users)
      .innerJoin(authCredentials, eq(users.id, authCredentials.userId))
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    return row
      ? {
          user: userView(row.user),
          passwordHash: row.hash,
          disabled: row.user.disabledAt !== null,
        }
      : null;
  }
  async createSession(
    userId: string,
    expectedHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<AuthSession | null> {
    return this.db.transaction(async (tx) => {
      const [credential] = await tx
        .select()
        .from(authCredentials)
        .where(eq(authCredentials.userId, userId))
        .for("update");
      const [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.disabledAt)))
        .for("share");
      if (!user || credential?.passwordHash !== expectedHash) return null;
      const [session] = await tx
        .insert(authSessions)
        .values({ userId, tokenHash, expiresAt })
        .returning();
      return {
        id: session.id,
        user: userView(user),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        mfaVerifiedAt: session.mfaVerifiedAt,
      };
    });
  }
  async session(tokenHash: string): Promise<AuthSession | null> {
    const [row] = await this.db
      .select({ session: authSessions, user: users })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, sql`now()`),
          isNull(users.disabledAt),
        ),
      )
      .limit(1);
    return row
      ? {
          id: row.session.id,
          user: userView(row.user),
          createdAt: row.session.createdAt,
          expiresAt: row.session.expiresAt,
          mfaVerifiedAt: row.session.mfaVerifiedAt,
        }
      : null;
  }
  async revoke(tokenHash: string) {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(authSessions.tokenHash, tokenHash));
  }
  async queueReset(
    email: string,
    tokenHash: string,
    sealedProof: string,
    expiresAt: Date,
  ) {
    await this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(authCredentials, eq(users.id, authCredentials.userId))
        .where(
          and(sql`lower(${users.email}) = ${email}`, isNull(users.disabledAt)),
        )
        .limit(1);
      if (!user) return;
      const [reset] = await tx
        .insert(authPasswordResets)
        .values({ userId: user.id, tokenHash, expiresAt })
        .returning();
      await tx
        .insert(authResetDeliveries)
        .values({ resetId: reset.id, sealedProof });
    });
  }
  async reset(tokenHash: string, passwordHash: string) {
    return this.db.transaction(async (tx) => {
      const [reset] = await tx
        .select()
        .from(authPasswordResets)
        .where(eq(authPasswordResets.tokenHash, tokenHash))
        .limit(1);
      if (!reset) return false;
      // Same credential lock as login: no stale-password session can survive recovery.
      const [credential] = await tx
        .select()
        .from(authCredentials)
        .where(eq(authCredentials.userId, reset.userId))
        .for("update");
      const [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, reset.userId), isNull(users.disabledAt)))
        .for("update");
      if (!credential || !user) return false;
      const [consumed] = await tx
        .update(authPasswordResets)
        .set({ consumedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(authPasswordResets.id, reset.id),
            isNull(authPasswordResets.consumedAt),
            gt(authPasswordResets.expiresAt, sql`now()`),
          ),
        )
        .returning();
      if (!consumed) return false;
      await tx
        .update(authCredentials)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(authCredentials.id, credential.id));
      await tx
        .update(users)
        .set({
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(authSessions.userId, user.id));
      await tx
        .update(authPasswordResets)
        .set({ consumedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(authPasswordResets.userId, user.id),
            isNull(authPasswordResets.consumedAt),
          ),
        );
      return true;
    });
  }
  async rateLimit(bucketKey: string, limit: number, seconds: number) {
    // Use the DB clock and UPSERT row lock; rejected requests do not extend a window.
    const stale = sql`${authRateLimits.windowStartedAt} <= now() - make_interval(secs => ${seconds})`;
    const [row] = await this.db
      .insert(authRateLimits)
      .values({ bucketKey, windowStartedAt: sql`now()` })
      .onConflictDoUpdate({
        target: authRateLimits.bucketKey,
        set: {
          hits: sql`CASE WHEN ${stale} THEN 1 ELSE ${authRateLimits.hits} + 1 END`,
          windowStartedAt: sql`CASE WHEN ${stale} THEN now() ELSE ${authRateLimits.windowStartedAt} END`,
          updatedAt: new Date(),
        },
        setWhere: sql`${stale} OR ${authRateLimits.hits} < ${limit}`,
      })
      .returning();
    return Boolean(row);
  }
  async mfa(userId: string) {
    const [row] = await this.db
      .select()
      .from(authMfa)
      .where(eq(authMfa.userId, userId));
    return row
      ? { sealedSecret: row.sealedSecret, confirmed: row.confirmed }
      : null;
  }
  async enrollMfa(userId: string, expectedHash: string, sealedSecret: string) {
    return this.db.transaction(async (tx) => {
      const [credential] = await tx
        .select()
        .from(authCredentials)
        .where(eq(authCredentials.userId, userId))
        .for("update");
      if (credential?.passwordHash !== expectedHash) return false;
      const [row] = await tx
        .insert(authMfa)
        .values({ userId, sealedSecret })
        .onConflictDoUpdate({
          target: authMfa.userId,
          set: { sealedSecret, updatedAt: new Date(), lastAcceptedStep: 0 },
          setWhere: eq(authMfa.confirmed, false),
        })
        .returning();
      return Boolean(row);
    });
  }
  async verifyMfa(
    userId: string,
    sessionId: string,
    expectedSecret: string,
    step: number,
  ) {
    return this.db.transaction(async (tx) => {
      const [factor] = await tx
        .update(authMfa)
        .set({ confirmed: true, lastAcceptedStep: step, updatedAt: new Date() })
        .where(
          and(
            eq(authMfa.userId, userId),
            eq(authMfa.sealedSecret, expectedSecret),
            sql`${authMfa.lastAcceptedStep} < ${step}`,
          ),
        )
        .returning();
      if (!factor) return false;
      const [session] = await tx
        .update(authSessions)
        .set({ mfaVerifiedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(authSessions.id, sessionId),
            eq(authSessions.userId, userId),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, sql`now()`),
          ),
        )
        .returning();
      if (!session) throw new Error("Session no longer active.");
      return true;
    });
  }
}
