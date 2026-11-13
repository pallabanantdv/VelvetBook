import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { NextRequest } from "next/server";
import { Secret, TOTP } from "otpauth";
import { AuthenticationService } from "@/modules/identity/application/authentication.server";
import { createIdentitySecurity } from "@/modules/identity/infrastructure/security.server";
import { sessionValidator } from "@/modules/identity/infrastructure/session-validation.server";
import { registrationSchema } from "@/modules/identity/presentation/validation.server";
import { readAuthenticationConfiguration } from "@/config/authentication.server";
import { hasPermission } from "@/modules/authorization/application/access.server";
import {
  enforceOrigin,
  handleAuthentication,
  readAuthBody,
} from "@/infrastructure/authentication/routes.server";
import { MemoryIdentityStore } from "./support/memory-identity";
import { deliverPasswordResets } from "@/infrastructure/authentication/reset-delivery.server";
import type { DatabaseClient } from "@/db/client.server";

const config = readAuthenticationConfiguration({
  AUTH_ORIGIN: "http://localhost:3000",
  AUTH_SECRET: "test-secret-".repeat(8),
  NODE_ENV: "test",
});
const password = "Correct horse battery staple!";
function fixture() {
  const store = new MemoryIdentityStore();
  const security = createIdentitySecurity(config.secret);
  return { store, security, auth: new AuthenticationService(store, security) };
}

test("OpenAPI lists every implemented auth endpoint with strict input schemas", () => {
  const document = JSON.parse(
    readFileSync("docs/backend/openapi.json", "utf8"),
  );
  assert.equal(document.openapi, "3.1.0");
  assert.equal(Object.keys(document.paths).filter((path) => path.startsWith("/api/v1/auth/")).length, 8);
  for (const [path, operations] of Object.entries(document.paths)) {
    assert.ok(existsSync(`src/app${path}/route.ts`));
    for (const operation of Object.values(
      operations as Record<string, { responses: Record<string, unknown> }>,
    ))
      for (const status of [400, 401, 403, 429, 503])
        assert.ok(operation.responses[status]);
  }
  assert.equal(
    document.components.schemas.Registration.additionalProperties,
    false,
  );
});

test("strict registration rejects privilege injection and password truncation", () => {
  const base = {
    email: "person@example.test",
    displayName: "Person",
    password,
  };
  assert.equal(registrationSchema.safeParse(base).success, true);
  for (const extra of [
    { role: "platform_admin" },
    { organizationId: crypto.randomUUID() },
    { role: "owner" },
    { permissions: ["*"] },
  ])
    assert.equal(
      registrationSchema.safeParse({ ...base, ...extra }).success,
      false,
    );
  assert.equal(
    registrationSchema.safeParse({ ...base, password: "a".repeat(73) }).success,
    false,
  );
  assert.equal(
    registrationSchema.safeParse({ ...base, password: "🔒".repeat(30) })
      .success,
    false,
  );
});
test("auth config enforces production HTTPS, trusted origin and nonpublic secrets", () => {
  assert.throws(() =>
    readAuthenticationConfiguration({
      AUTH_ORIGIN: "http://example.test",
      AUTH_SECRET: config.secret,
      NODE_ENV: "production",
    }),
  );
  assert.throws(() =>
    readAuthenticationConfiguration({
      AUTH_ORIGIN: config.origin,
      AUTH_SECRET: config.secret,
      NEXT_PUBLIC_AUTH_SECRET: "secret",
    }),
  );
  assert.equal(
    readAuthenticationConfiguration({
      AUTH_ORIGIN: "https://example.test",
      AUTH_SECRET: config.secret,
      NODE_ENV: "production",
    }).cookieName,
    "__Host-velvetbook_session",
  );
});
test("password hashing, invalid credentials, tampered/revoked/expired sessions", async () => {
  const { store, auth, security } = fixture();
  await auth.register("person@example.test", "Person", password);
  assert.match(
    store.credentials.get("person@example.test")!.passwordHash,
    /^\$2[aby]\$12\$/,
  );
  await assert.rejects(auth.login("person@example.test", "incorrect"));
  await assert.rejects(auth.login("unknown@example.test", password));
  const { session, cookie } = await auth.login("person@example.test", password);
  assert.equal((await auth.authenticate(cookie)).user.id, session.user.id);
  const verified = await sessionValidator(auth).validate({
    opaqueValue: cookie,
  });
  assert.equal(verified.ok, true);
  if (verified.ok)
    assert.equal(verified.value.identity.userId, session.user.id);
  // Alter authenticated seal bytes; the library ignores its trailing version marker.
  await assert.rejects(
    auth.authenticate(
      cookie.slice(0, 25) + (cookie[25] === "x" ? "y" : "x") + cookie.slice(26),
    ),
  );
  assert.equal(await security.open(cookie, "reset", 900), null);
  session.expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(auth.authenticate(cookie));
  const next = await auth.login("person@example.test", password);
  await auth.logout(next.cookie);
  await assert.rejects(auth.authenticate(next.cookie));
  assert.equal(
    (await sessionValidator(auth).validate({ opaqueValue: next.cookie })).ok,
    false,
  );
});
test("single-use reset proofs revoke sessions, preserve generic unknown-account behavior", async () => {
  const { store, auth, security } = fixture();
  await auth.register("person@example.test", "Person", password);
  const { cookie } = await auth.login("person@example.test", password);
  await auth.requestReset("unknown@example.test");
  assert.equal(store.resets.size, 0);
  await auth.requestReset("person@example.test");
  const reset = [...store.resets.values()][0];
  const token = await security.open(reset.sealedProof, "reset", 900);
  assert.ok(token);
  await auth.reset(token, password + "new");
  await assert.rejects(auth.authenticate(cookie));
  await assert.rejects(auth.reset(token, password));
  await assert.rejects(auth.login("person@example.test", password));
  assert.ok(await auth.login("person@example.test", password + "new"));
});
test("expired reset and disabled accounts cannot authenticate", async () => {
  const { store, auth, security } = fixture();
  await auth.register("person@example.test", "Person", password);
  await auth.requestReset("person@example.test");
  const reset = [...store.resets.values()][0];
  reset.expiresAt = new Date(0);
  await assert.rejects(
    auth.reset(
      (await security.open(reset.sealedProof, "reset", 900))!,
      password,
    ),
  );
  const { cookie } = await auth.login("person@example.test", password);
  store.credentials.get("person@example.test")!.disabled = true;
  await assert.rejects(auth.authenticate(cookie));
  await assert.rejects(auth.login("person@example.test", password));
});
test("shared account rate limiter stops repeated credential attempts", async () => {
  const { auth } = fixture();
  for (let count = 0; count < 5; count++)
    await auth.throttle("login", "person@example.test");
  await assert.rejects(
    auth.throttle("login", "person@example.test"),
    (error: { category?: string }) => error.category === "rate_limited",
  );
});

test("recovery delivery binds encrypted proof to its digest and uses a private fragment link", async () => {
  const { security } = fixture();
  const token = security.token();
  const sealed = await security.seal(token, "reset", 900);
  for (const valid of [true, false]) {
    let calls = 0;
    const sent: { resetUrl: string; idempotencyKey: string }[] = [];
    const db = {
      async execute() {
        calls += 1;
        return {
          rows:
            calls === 1
              ? [{ id: "delivery", reset_id: "reset", sealed_proof: sealed }]
              : calls === 2
                ? [
                    {
                      email: "person@example.test",
                      token_hash: valid ? security.digest(token) : "different",
                    },
                  ]
                : [],
        };
      },
    } as unknown as DatabaseClient["db"];
    const result = await deliverPasswordResets(
      db,
      security,
      config.origin,
      {
        async send(input) {
          sent.push(input);
        },
      },
      1,
    );
    assert.equal(result.sent, valid ? 1 : 0);
    assert.equal(sent.length, valid ? 1 : 0);
    if (valid) {
      const url = new URL(sent[0].resetUrl);
      assert.equal(url.origin, config.origin);
      assert.equal(url.search, "");
      assert.equal(url.hash, "#token=" + token);
      assert.equal(sent[0].idempotencyKey, "delivery");
    }
  }
});
test("TOTP enrollment requires password and accepted time step cannot replay", async () => {
  const { auth } = fixture();
  await auth.register("person@example.test", "Person", password);
  const { session } = await auth.login("person@example.test", password);
  await assert.rejects(auth.enrollMfa(session, "wrong"));
  const factor = await auth.enrollMfa(session, password);
  const token = new TOTP({
    secret: Secret.fromBase32(factor.secret),
  }).generate();
  await auth.verifyMfa(session, token);
  assert.ok(session.mfaVerifiedAt);
  await assert.rejects(auth.verifyMfa(session, token));
  await assert.rejects(auth.enrollMfa(session, password));
});
test("role bundles deny cross-scope privileges and unrestricted staff management", () => {
  assert.equal(
    hasPermission("organization_owner", {
      scope: "platform",
      resource: "user",
      action: "disable",
    }),
    false,
  );
  assert.equal(
    hasPermission("platform_admin", {
      scope: "organization",
      resource: "booking",
      action: "manage",
    }),
    false,
  );
  assert.equal(
    hasPermission("staff", {
      scope: "organization",
      resource: "booking",
      action: "manage",
    }),
    false,
  );
  assert.equal(
    hasPermission("organization_manager", {
      scope: "organization",
      resource: "membership",
      action: "manage",
    }),
    false,
  );
  assert.equal(
    hasPermission("customer", {
      scope: "customer",
      resource: "profile",
      action: "read",
    }),
    true,
  );
});
test("origin and streaming body bounds apply before authentication work", async () => {
  assert.throws(() =>
    enforceOrigin(
      new Request(config.origin, { headers: { origin: "https://evil.test" } }),
      config.origin,
    ),
  );
  await assert.rejects(
    readAuthBody(
      new Request(config.origin, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "a".repeat(8193),
      }),
    ),
  );
});
test("HTTP registration/login/me/logout share sanitized responses and secure cookie policy", async () => {
  const { auth } = fixture();
  const runtime = () => ({
    auth,
    config,
    authorization: { memberships: async () => [] },
  });
  function request(path: string, body?: unknown, cookie?: string) {
    return new NextRequest(config.origin + path, {
      method: body ? "POST" : "GET",
      headers: {
        origin: config.origin,
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const registered = await handleAuthentication(
    request("/register", {
      email: "person@example.test",
      displayName: "Person",
      password,
    }),
    "register",
    runtime,
  );
  assert.equal(registered.status, 202);
  assert.equal(registered.headers.get("set-cookie"), null);
  const loggedIn = await handleAuthentication(
    request("/login", { email: "person@example.test", password }),
    "login",
    runtime,
  );
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.headers.get("cache-control"), "no-store");
  const cookie = loggedIn.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.equal(
    (
      await handleAuthentication(
        request("/me", undefined, cookie.split(";")[0]),
        "me",
        runtime,
      )
    ).status,
    200,
  );
  const failed = await handleAuthentication(
    request("/login", { email: "person@example.test", password: "incorrect" }),
    "login",
    runtime,
  );
  assert.equal(failed.status, 401);
  assert.equal(
    JSON.stringify(await failed.json()).includes("password_hash"),
    false,
  );
  const logout = await handleAuthentication(
    request("/logout", {}, cookie.split(";")[0]),
    "logout",
    runtime,
  );
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/i);
  assert.equal(
    (
      await handleAuthentication(
        request("/me", undefined, cookie.split(";")[0]),
        "me",
        runtime,
      )
    ).status,
    401,
  );
  const secureConfig = readAuthenticationConfiguration({
    AUTH_ORIGIN: "https://example.test",
    AUTH_SECRET: config.secret,
    NODE_ENV: "production",
  });
  const secureLogin = await handleAuthentication(
    new NextRequest(secureConfig.origin + "/api/v1/auth/login", {
      method: "POST",
      headers: {
        origin: secureConfig.origin,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "person@example.test", password }),
    }),
    "login",
    () => ({ ...runtime(), config: secureConfig }),
  );
  const secureCookie = secureLogin.headers.get("set-cookie")!;
  assert.match(secureCookie, /^__Host-velvetbook_session=/);
  assert.match(secureCookie, /; Secure/i);
  assert.equal(/; Domain=/i.test(secureCookie), false);
});
