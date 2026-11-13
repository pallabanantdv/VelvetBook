import "server-only";
import type {
  IdentityStore,
  IdentitySecurity,
  AuthSession,
} from "./ports/runtime.server";

export class AuthenticationError extends Error {
  constructor(
    readonly category:
      "unauthenticated" | "forbidden" | "validation" | "rate_limited",
  ) {
    super(category);
  }
}

/** Consumer-owned persistence and security ports keep library/DB details outside application. */
export class AuthenticationService {
  constructor(
    readonly store: IdentityStore,
    readonly security: IdentitySecurity,
    readonly sessionSeconds = 28800,
    readonly resetSeconds = 900,
  ) {}

  async throttle(
    action: string,
    selector = "global",
    limit = 5,
    seconds = 900,
  ) {
    if (
      !(await this.store.rateLimit(
        this.security.limiterKey(`${action}:${selector}`),
        limit,
        seconds,
      ))
    )
      throw new AuthenticationError("rate_limited");
  }
  async register(email: string, displayName: string, password: string) {
    await this.throttle("register", email, 3, 3600);
    await this.store.register(
      email,
      displayName,
      await this.security.hash(password),
    );
  }
  async login(email: string, password: string) {
    await this.throttle("login", email);
    const credential = await this.store.credential(email);
    if (!credential) {
      await this.security.dummyVerify(password);
      throw new AuthenticationError("unauthenticated");
    }
    const valid = await this.security.verify(password, credential.passwordHash);
    if (!valid || credential.disabled)
      throw new AuthenticationError("unauthenticated");
    const token = this.security.token();
    const session = await this.store.createSession(
      credential.user.id,
      credential.passwordHash,
      this.security.digest(token),
      new Date(Date.now() + this.sessionSeconds * 1000),
    );
    if (!session) throw new AuthenticationError("unauthenticated");
    return {
      session,
      cookie: await this.security.seal(token, "session", this.sessionSeconds),
    };
  }
  async authenticate(cookie: string | null): Promise<AuthSession> {
    if (!cookie || cookie.length > 4096)
      throw new AuthenticationError("unauthenticated");
    const token = await this.security.open(
      cookie,
      "session",
      this.sessionSeconds,
    );
    const session = token
      ? await this.store.session(this.security.digest(token))
      : null;
    if (!session || session.expiresAt.getTime() <= Date.now())
      throw new AuthenticationError("unauthenticated");
    return session;
  }
  async logout(cookie: string | null) {
    const token = cookie
      ? await this.security.open(cookie, "session", this.sessionSeconds)
      : null;
    if (token) await this.store.revoke(this.security.digest(token));
  }
  async requestReset(email: string) {
    await this.throttle("reset", email, 3, 3600);
    const token = this.security.token();
    await this.store.queueReset(
      email,
      this.security.digest(token),
      await this.security.seal(token, "reset", this.resetSeconds),
      new Date(Date.now() + this.resetSeconds * 1000),
    );
  }
  async reset(token: string, password: string) {
    await this.throttle("reset-proof", token);
    if (
      !(await this.store.reset(
        this.security.digest(token),
        await this.security.hash(password),
      ))
    )
      throw new AuthenticationError("validation");
  }
  async enrollMfa(session: AuthSession, password: string) {
    await this.throttle("mfa-enroll", session.user.id);
    const credential = await this.store.credential(session.user.email);
    if (
      !credential ||
      credential.disabled ||
      !(await this.security.verify(password, credential.passwordHash))
    )
      throw new AuthenticationError("unauthenticated");
    const totp = this.security.newTotp(session.user.email);
    if (
      !(await this.store.enrollMfa(
        session.user.id,
        credential.passwordHash,
        await this.security.seal(totp.secret, "mfa", 0),
      ))
    )
      throw new AuthenticationError("forbidden");
    return { secret: totp.secret, uri: totp.uri };
  }
  async verifyMfa(session: AuthSession, token: string) {
    await this.throttle("mfa-verify", session.user.id);
    const factor = await this.store.mfa(session.user.id);
    const secret = factor
      ? await this.security.open(factor.sealedSecret, "mfa", 0)
      : null;
    const step = secret
      ? this.security.totpStep(secret, token, new Date())
      : null;
    if (
      step === null ||
      !factor ||
      !(await this.store.verifyMfa(
        session.user.id,
        session.id,
        factor.sealedSecret,
        step,
      ))
    )
      throw new AuthenticationError("unauthenticated");
  }
}
