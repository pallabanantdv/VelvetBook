import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import type { DatabaseClient } from "@/db/client.server";
import { createDatabase } from "@/db/client.server";
import {
  readMigrationPlan,
  executeMigrationPlan,
} from "@/db/migrations.server";
import {
  users,
  organizations,
  organizationMembers,
  stores,
  staff,
  bookings,
  authMfa,
  authSessions,
  authPasswordResets,
  authResetDeliveries,
  platformGrants,
} from "@/db/schema";
import { AuthenticationService } from "@/modules/identity/application/authentication.server";
import { PostgresIdentityStore } from "@/modules/identity/infrastructure/postgres.server";
import { createIdentitySecurity } from "@/modules/identity/infrastructure/security.server";
import { DatabaseAuthorization } from "@/modules/authorization/infrastructure/access.server";

loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

test("PostgreSQL authentication and cross-tenant authorization", async (t) => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Configure an explicit disposable TEST_DATABASE_URL ending in _test.",
  );
  const url = new URL(process.env.TEST_DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  assert.match(databaseName, /^[a-z0-9_]+_test$/);
  if (process.env.DATABASE_URL) {
    const app = new URL(process.env.DATABASE_URL);
    assert.ok(
      app.hostname !== url.hostname ||
        (app.port || "5432") !== (url.port || "5432") ||
        app.pathname !== url.pathname,
      "Never run integration tests on the application database.",
    );
  }
  const database = createDatabase({
    ...process.env,
    NODE_ENV: "test",
    DATABASE_ENABLED: "true",
    DATABASE_URL: process.env.TEST_DATABASE_URL,
  });
  const rollback = new Error("rollback-fixtures");
  try {
    const connection = await database.pool.connect();
    try {
      const plan = readMigrationPlan();
      await executeMigrationPlan(
        connection,
        plan,
        plan.fingerprint,
        databaseName,
      );
    } finally {
      connection.release();
    }
    await assert.rejects(
      database.db.transaction(async (transaction) => {
        // Transaction.transaction uses savepoints, so service commits never escape fixture rollback.
        const db = transaction as unknown as DatabaseClient["db"];
        const store = new PostgresIdentityStore(db);
        const security = createIdentitySecurity(
          "integration-secret-".repeat(6),
        );
        const auth = new AuthenticationService(store, security);
        const access = new DatabaseAuthorization(db);
        const suffix = randomUUID();
        const password = "Integration password long enough!";
        const emails = ["owner", "manager", "staff", "admin", "customer"].map(
          (name) => `${name}-${suffix}@example.test`,
        );
        const sessions = [];
        for (const email of emails) {
          await auth.register(email, "Fixture", password);
          sessions.push(await auth.login(email, password));
        }
        const [owner, manager, assigned, admin, customer] = sessions;
        const [orgA, orgB] = await db
          .insert(organizations)
          .values([
            { name: "A", slug: `a-${suffix}` },
            { name: "B", slug: `b-${suffix}` },
          ])
          .returning();
        const [storeA, storeB] = await db
          .insert(stores)
          .values([
            { organizationId: orgA.id, name: "A", slug: "a", timezone: "UTC" },
            { organizationId: orgB.id, name: "B", slug: "b", timezone: "UTC" },
          ])
          .returning();
        const [, , staffMember] = await db
          .insert(organizationMembers)
          .values([
            {
              organizationId: orgA.id,
              userId: owner.session.user.id,
              role: "owner",
            },
            {
              organizationId: orgA.id,
              userId: manager.session.user.id,
              role: "manager",
            },
            {
              organizationId: orgA.id,
              userId: assigned.session.user.id,
              role: "staff",
            },
            {
              organizationId: orgB.id,
              userId: owner.session.user.id,
              role: "manager",
            },
          ])
          .returning();
        await db.insert(staff).values({
          organizationId: orgA.id,
          storeId: storeA.id,
          organizationMemberId: staffMember.id,
        });
        await t.test(
          "public registration creates neither memberships nor admin grants",
          async () => {
            assert.equal(
              (await access.memberships(customer.session.id)).length,
              0,
            );
            await assert.rejects(
              access.platform(customer.session.id, {
                scope: "platform",
                resource: "admin",
                action: "read",
              }),
            );
          },
        );
        await t.test(
          "one user has distinct privileges in multiple organizations",
          async () => {
            assert.equal(
              (await access.memberships(owner.session.id)).length,
              2,
            );
            await access.organization(owner.session.id, orgA.id, {
              scope: "organization",
              resource: "organization",
              action: "update",
            });
            await assert.rejects(
              access.organization(owner.session.id, orgB.id, {
                scope: "organization",
                resource: "organization",
                action: "update",
              }),
            );
          },
        );
        await t.test(
          "cross-tenant selectors and foreign resource IDs deny access",
          async () => {
            await assert.rejects(
              access.organization(manager.session.id, orgB.id, {
                scope: "organization",
                resource: "store",
                action: "read",
              }),
            );
            await assert.rejects(
              access.organization(
                owner.session.id,
                orgA.id,
                { scope: "organization", resource: "store", action: "read" },
                { kind: "store", id: storeB.id },
              ),
            );
          },
        );
        await t.test(
          "staff needs an assigned store and cannot manage memberships",
          async () => {
            await access.organization(
              assigned.session.id,
              orgA.id,
              { scope: "organization", resource: "store", action: "read" },
              { kind: "store", id: storeA.id },
            );
            await assert.rejects(
              access.organization(assigned.session.id, orgA.id, {
                scope: "organization",
                resource: "store",
                action: "read",
              }),
            );
            await assert.rejects(
              access.organization(assigned.session.id, orgA.id, {
                scope: "organization",
                resource: "membership",
                action: "manage",
              }),
            );
          },
        );
        const [booking] = await db
          .insert(bookings)
          .values({
            organizationId: orgA.id,
            storeId: storeA.id,
            customerUserId: customer.session.user.id,
            status: "confirmed",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 1800000),
            totalAmount: "20.00",
            currency: "USD",
            idempotencyKey: randomUUID(),
            requestFingerprint: "a".repeat(64),
            policySnapshot: {},
          })
          .returning();
        await t.test(
          "customer booking ownership is enforced and staff needs item assignment",
          async () => {
            await access.customer(
              customer.session.id,
              { scope: "customer", resource: "booking", action: "read" },
              { kind: "booking", id: booking.id },
            );
            await assert.rejects(
              access.customer(
                owner.session.id,
                { scope: "customer", resource: "booking", action: "read" },
                { kind: "booking", id: booking.id },
              ),
            );
            await assert.rejects(
              access.organization(
                assigned.session.id,
                orgA.id,
                { scope: "organization", resource: "booking", action: "read" },
                { kind: "booking", id: booking.id },
              ),
            );
          },
        );
        await t.test(
          "platform grants are separate and require fresh MFA",
          async () => {
            await db
              .insert(platformGrants)
              .values({ userId: admin.session.user.id });
            await assert.rejects(
              access.platform(admin.session.id, {
                scope: "platform",
                resource: "admin",
                action: "read",
              }),
            );
            await db
              .update(users)
              .set({ emailVerifiedAt: new Date() })
              .where(eq(users.id, admin.session.user.id));
            await db.insert(authMfa).values({
              userId: admin.session.user.id,
              confirmed: true,
              sealedSecret: await security.seal("fixture", "mfa", 0),
            });
            await db
              .update(authSessions)
              .set({ mfaVerifiedAt: new Date() })
              .where(eq(authSessions.id, admin.session.id));
            await access.platform(admin.session.id, {
              scope: "platform",
              resource: "admin",
              action: "read",
            });
            await assert.rejects(
              access.organization(admin.session.id, orgA.id, {
                scope: "organization",
                resource: "organization",
                action: "read",
              }),
            );
            await db
              .update(authSessions)
              .set({ mfaVerifiedAt: new Date(Date.now() - 700000) })
              .where(eq(authSessions.id, admin.session.id));
            await assert.rejects(
              access.platform(admin.session.id, {
                scope: "platform",
                resource: "admin",
                action: "read",
              }),
            );
          },
        );
        await t.test(
          "invalid credentials and expired/revoked sessions fail",
          async () => {
            await assert.rejects(auth.login(emails[0], "incorrect"));
            await auth.logout(owner.cookie);
            await assert.rejects(auth.authenticate(owner.cookie));
            await db
              .update(authSessions)
              .set({
                createdAt: new Date(Date.now() - 100000),
                expiresAt: new Date(Date.now() - 1000),
              })
              .where(eq(authSessions.id, manager.session.id));
            await assert.rejects(auth.authenticate(manager.cookie));
            await assert.rejects(access.memberships(manager.session.id));
          },
        );
        await t.test(
          "password recovery is one-time and revokes every existing session",
          async () => {
            await auth.requestReset(emails[4]);
            const [delivery] = await db
              .select({ sealedProof: authResetDeliveries.sealedProof })
              .from(authResetDeliveries)
              .innerJoin(
                authPasswordResets,
                eq(authPasswordResets.id, authResetDeliveries.resetId),
              )
              .where(eq(authPasswordResets.userId, customer.session.user.id));
            const token = await security.open(
              delivery.sealedProof,
              "reset",
              900,
            );
            assert.ok(token);
            await auth.reset(token, password + "changed");
            await assert.rejects(auth.authenticate(customer.cookie));
            await assert.rejects(auth.reset(token, password));
          },
        );
        throw rollback;
      }),
      (error) => error === rollback,
    );
  } finally {
    await database.close();
  }
});
