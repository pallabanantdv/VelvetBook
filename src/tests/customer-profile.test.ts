import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { CustomerProfile } from "@/modules/customers/domain/entities/model";
import type { CustomerProfileRepository } from "@/modules/customers/application/public";
import { CustomerProfiles, isSelfProfileContext } from "@/modules/customers/application/profile.server";
import { customerProfilePatchSchema } from "@/modules/customers/presentation/validation.server";
import { handleCustomerProfile } from "@/infrastructure/customers/profile.server";
import { AuthenticationError } from "@/modules/identity/application/authentication.server";
import { parseCustomerPaginationQuery } from "@/shared/validation/customer-pagination.server";

function context(userId: string, action: "read" | "update"): CustomerOperationContext {
  const session = { sessionId: "session-" + userId, identity: { userId, status: "active", emailVerified: false }, expiresAt: new Date(Date.now() + 100000) };
  return { session, authorization: { request: { scope: "customer", session, permission: { scope: "customer", resource: "profile", action },
    target: { kind: "customer_collection", resourceKind: "profile" } }, authorizedAt: new Date() } } as CustomerOperationContext;
}
class Profiles implements CustomerProfileRepository {
  rows = new Map<string, CustomerProfile>();
  async findSelf(ctx: CustomerOperationContext) { return { ok: true as const, value: this.rows.get(ctx.session.identity.userId) ?? null }; }
  async saveSelf(input: Parameters<CustomerProfileRepository["saveSelf"]>[0]) {
    const old = this.rows.get(input.context.session.identity.userId);
    if ((old?.revision ?? null) !== input.expectedRevision) return { ok: false as const, error: { code: "conflict" as const, message: "Conflict" } };
    this.rows.set(input.context.session.identity.userId, input.profile); return { ok: true as const, value: input.profile };
  }
}
test("profile PATCH rejects restricted fields, invalid references and empty updates", () => {
  assert.equal(customerProfilePatchSchema.safeParse({ expectedRevision: 0, displayName: "Name" }).success, true);
  for (const value of [ { expectedRevision: 1 }, { expectedRevision: 0, phone: "+919876543210" },
    { expectedRevision: 1, email: "other@example.test" }, { expectedRevision: 1, userId: crypto.randomUUID() },
    { expectedRevision: 1, role: "owner" }, { expectedRevision: 1, revision: 100 },
    { expectedRevision: 1, phone: "1234" }, { expectedRevision: 1, avatarReference: "https://private.test/pic" },
    { expectedRevision: 1, preferences: { permissions: ["*"] } }, { expectedRevision: 1, preferences: {} },
    { expectedRevision: 1, locale: "bad locale!" }, { expectedRevision: 1, timezone: "Not/AZone" },
    { expectedRevision: 1, displayName: " " }, { expectedRevision: -1, displayName: "Name" } ]) {
    assert.equal(customerProfilePatchSchema.safeParse(value).success, false, JSON.stringify(value));
  }
  const parsed = customerProfilePatchSchema.parse({ expectedRevision: 1, locale: "en-us", phone: null, timezone: "UTC", preferences: { theme: "dark" } });
  assert.equal(parsed.locale, "en-US");
});
test("profile service merges only provided fields, clears nullable fields and detects stale revisions", async () => {
  const store = new Profiles(); const service = new CustomerProfiles(store, () => crypto.randomUUID() as CustomerProfile["id"], () => new Date());
  const first = await service.updateSelf({ context: context("first", "update"), expectedRevision: 0, profile: { displayName: "Name", phone: "+919876543210" } });
  assert.equal(first.ok, true); if (!first.ok) return;
  assert.equal(first.value.revision, 1); assert.equal(first.value.locale, "en");
  const next = await service.updateSelf({ context: context("first", "update"), expectedRevision: 1, profile: { phone: null, preferences: { theme: "dark" } } });
  assert.equal(next.ok, true); if (!next.ok) return;
  assert.equal(next.value.phone, null); assert.equal(next.value.displayName, "Name"); assert.equal(next.value.preferences.bookingReminders, true);
  assert.equal(next.value.id, first.value.id); assert.equal(next.value.createdAt, first.value.createdAt);
  assert.equal((await service.updateSelf({ context: context("first", "update"), expectedRevision: 1, profile: { displayName: "stale" } })).ok, false);
});
test("profile contexts cannot mix identities/actions or read another user's record", async () => {
  const store = new Profiles(); const service = new CustomerProfiles(store, () => crypto.randomUUID() as CustomerProfile["id"], () => new Date());
  await service.updateSelf({ context: context("first", "update"), expectedRevision: 0, profile: { displayName: "Private" } });
  assert.deepEqual(await service.readSelf(context("second", "read")), { ok: true, value: null });
  const mixed = { ...context("first", "read"), session: context("second", "read").session };
  assert.equal(isSelfProfileContext(mixed, "read"), false); assert.equal((await service.readSelf(mixed)).ok, false);
  assert.equal((await service.updateSelf({ context: context("first", "read"), expectedRevision: 1, profile: { displayName: "bad" } })).ok, false);
});
test("profile HTTP requires auth and rejects body/query identity selectors", async () => {
  const store = new Profiles(); const profiles = new CustomerProfiles(store, () => crypto.randomUUID() as CustomerProfile["id"], () => new Date());
  const runtime = () => ({ profiles, async authorize(request: NextRequest, action: "read" | "update") {
    const id = request.cookies.get("test-user")?.value; if (!id) throw new AuthenticationError("unauthenticated"); return context(id, action);
  } });
  function request(method: string, user?: string, body?: unknown, query = "") { return new NextRequest("http://localhost/api/v1/customer/profile" + query, {
    method, headers: { "content-type": "application/json", ...(user ? { cookie: "test-user=" + user } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  assert.equal((await handleCustomerProfile(request("GET"), runtime)).status, 401);
  assert.equal((await handleCustomerProfile(request("GET", "first"), runtime)).status, 404);
  assert.equal((await handleCustomerProfile(request("PATCH", "first", { expectedRevision: 0, displayName: "Name" }), runtime)).status, 200);
  const read = await handleCustomerProfile(request("GET", "first"), runtime); assert.equal(read.headers.get("cache-control"), "no-store");
  assert.equal((await read.json()).data.userId, "first");
  assert.equal((await handleCustomerProfile(request("GET", "second"), runtime)).status, 404);
  assert.equal((await handleCustomerProfile(request("GET", "second", undefined, "?userId=first"), runtime)).status, 400);
  assert.equal((await handleCustomerProfile(request("PATCH", "second", { expectedRevision: 0, displayName: "Bad", userId: "first" }), runtime)).status, 400);
  assert.equal((await handleCustomerProfile(request("PATCH", "first", { expectedRevision: 0, displayName: "stale" }), runtime)).status, 409);
});
test("future customer pagination uses bounded canonical limits and rejects duplicate/unknown selectors", () => {
  assert.deepEqual(parseCustomerPaginationQuery(new URLSearchParams()).data, { cursor: null, limit: 25 });
  for (const query of ["limit=101", "limit=-1", "limit=1.5", "limit=01", "limit=10&limit=20", "cursor=", "userId=other", "__proto__=other"])
    assert.equal(parseCustomerPaginationQuery(new URLSearchParams(query)).success, false, query);
  assert.deepEqual(parseCustomerPaginationQuery(new URLSearchParams("limit=100&cursor=opaque")).data, { cursor: "opaque", limit: 100 });
});
