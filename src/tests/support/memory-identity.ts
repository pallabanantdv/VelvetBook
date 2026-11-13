import type {
  AuthSession,
  Credential,
  IdentityStore,
} from "@/modules/identity/application/ports/runtime.server";

/** Test-only adapter; production always uses PostgreSQL. */
export class MemoryIdentityStore implements IdentityStore {
  credentials = new Map<string, Credential>();
  sessions = new Map<string, AuthSession>();
  resets = new Map<
    string,
    { userId: string; sealedProof: string; expiresAt: Date; used: boolean }
  >();
  factors = new Map<
    string,
    { sealedSecret: string; confirmed: boolean; lastStep: number }
  >();
  buckets = new Map<string, { hits: number; until: number }>();
  async register(email: string, displayName: string, passwordHash: string) {
    if (!this.credentials.has(email))
      this.credentials.set(email, {
        user: {
          id: crypto.randomUUID(),
          email,
          displayName,
          emailVerified: false,
        },
        passwordHash,
        disabled: false,
      });
  }
  async credential(email: string) {
    return this.credentials.get(email) ?? null;
  }
  async createSession(
    userId: string,
    expectedHash: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    const credential = [...this.credentials.values()].find(
      (value) => value.user.id === userId,
    );
    if (
      !credential ||
      credential.disabled ||
      credential.passwordHash !== expectedHash
    )
      return null;
    const session = {
      id: crypto.randomUUID(),
      user: credential.user,
      createdAt: new Date(),
      expiresAt,
      mfaVerifiedAt: null,
    };
    this.sessions.set(tokenHash, session);
    return session;
  }
  async session(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    return session &&
      !this.credentials.get(session.user.email)?.disabled &&
      session.expiresAt.getTime() > Date.now()
      ? session
      : null;
  }
  async revoke(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
  async queueReset(
    email: string,
    tokenHash: string,
    sealedProof: string,
    expiresAt: Date,
  ) {
    const credential = await this.credential(email);
    if (credential && !credential.disabled)
      this.resets.set(tokenHash, {
        userId: credential.user.id,
        sealedProof,
        expiresAt,
        used: false,
      });
  }
  async reset(tokenHash: string, passwordHash: string) {
    const reset = this.resets.get(tokenHash);
    if (!reset || reset.used || reset.expiresAt.getTime() <= Date.now())
      return false;
    const credential = [...this.credentials.values()].find(
      (value) => value.user.id === reset.userId,
    );
    if (!credential || credential.disabled) return false;
    credential.passwordHash = passwordHash;
    credential.user.emailVerified = true;
    for (const value of this.resets.values())
      if (value.userId === reset.userId) value.used = true;
    for (const [key, value] of this.sessions)
      if (value.user.id === reset.userId) this.sessions.delete(key);
    return true;
  }
  async rateLimit(key: string, limit: number, seconds: number) {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.until <= Date.now()) {
      bucket = { hits: 0, until: Date.now() + seconds * 1000 };
      this.buckets.set(key, bucket);
    }
    if (bucket.hits >= limit) return false;
    bucket.hits += 1;
    return true;
  }
  async mfa(userId: string) {
    return this.factors.get(userId) ?? null;
  }
  async enrollMfa(userId: string, expectedHash: string, sealedSecret: string) {
    if (
      ![...this.credentials.values()].some(
        (c) => c.user.id === userId && c.passwordHash === expectedHash,
      ) ||
      this.factors.get(userId)?.confirmed
    )
      return false;
    this.factors.set(userId, { sealedSecret, confirmed: false, lastStep: 0 });
    return true;
  }
  async verifyMfa(
    userId: string,
    sessionId: string,
    expectedSecret: string,
    step: number,
  ) {
    const factor = this.factors.get(userId);
    const session = [...this.sessions.values()].find(
      (s) => s.id === sessionId && s.user.id === userId,
    );
    if (
      !factor ||
      factor.sealedSecret !== expectedSecret ||
      factor.lastStep >= step ||
      !session
    )
      return false;
    factor.confirmed = true;
    factor.lastStep = step;
    session.mfaVerifiedAt = new Date();
    return true;
  }
}
