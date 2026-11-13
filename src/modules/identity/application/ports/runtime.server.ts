import "server-only";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}
export interface AuthSession {
  id: string;
  user: AuthUser;
  createdAt: Date;
  expiresAt: Date;
  mfaVerifiedAt: Date | null;
}
export interface Credential {
  user: AuthUser;
  passwordHash: string;
  disabled: boolean;
}
export interface IdentityStore {
  register(
    email: string,
    displayName: string,
    passwordHash: string,
  ): Promise<void>;
  credential(email: string): Promise<Credential | null>;
  createSession(
    userId: string,
    expectedHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<AuthSession | null>;
  session(tokenHash: string): Promise<AuthSession | null>;
  revoke(tokenHash: string): Promise<void>;
  queueReset(
    email: string,
    tokenHash: string,
    sealedProof: string,
    expiresAt: Date,
  ): Promise<void>;
  reset(tokenHash: string, passwordHash: string): Promise<boolean>;
  rateLimit(key: string, limit: number, seconds: number): Promise<boolean>;
  mfa(
    userId: string,
  ): Promise<{ sealedSecret: string; confirmed: boolean } | null>;
  enrollMfa(
    userId: string,
    expectedHash: string,
    sealedSecret: string,
  ): Promise<boolean>;
  verifyMfa(
    userId: string,
    sessionId: string,
    expectedSecret: string,
    step: number,
  ): Promise<boolean>;
}
export interface IdentitySecurity {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
  dummyVerify(password: string): Promise<void>;
  token(): string;
  digest(value: string): string;
  limiterKey(value: string): string;
  seal(
    value: string,
    purpose: "session" | "reset" | "mfa",
    ttl: number,
  ): Promise<string>;
  open(
    value: string,
    purpose: "session" | "reset" | "mfa",
    ttl: number,
  ): Promise<string | null>;
  newTotp(email: string): { secret: string; uri: string };
  totpStep(secret: string, token: string, now: Date): number | null;
}
