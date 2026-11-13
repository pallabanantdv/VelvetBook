import assert from "node:assert/strict";
import test from "node:test";
import { readDatabaseConfiguration } from "@/config/database.server";
import { createDatabase } from "@/db/client.server";
import { checkDatabaseHealth } from "@/db/health.server";
import {
  assertAdditiveMigration,
  executeMigrationPlan,
  readMigrationPlan,
} from "@/db/migrations.server";
import type { PoolClient } from "pg";
import { generateDrizzleJson } from "drizzle-kit/api";
import { readFileSync } from "node:fs";
import * as schema from "@/db/schema";

const env = {
  DATABASE_ENABLED: "true",
  DATABASE_URL: "postgresql://user:private-sentinel@localhost/velvetbook_test",
};

test("database config bounds pool/timeouts and enforces verified production TLS", () => {
  const config = readDatabaseConfiguration(env);
  assert.equal(config.max, 10);
  assert.equal(config.min, 0);
  assert.equal(config.connectionTimeoutMillis, 5000);
  assert.equal(config.ssl, false);
  assert.deepEqual(
    readDatabaseConfiguration({ ...env, NODE_ENV: "production" }).ssl,
    { rejectUnauthorized: true },
  );
  for (const change of [
    { DATABASE_ENABLED: "false" },
    { DATABASE_POOL_MAX: "0" },
    { DATABASE_POOL_MAX: "101" },
    { DATABASE_CONNECTION_TIMEOUT_MS: "0" },
    { DATABASE_URL: "https://localhost/db" },
    { DATABASE_URL: "postgresql:///db" },
    { DATABASE_URL: env.DATABASE_URL + "?sslmode=no-verify" },
    { NODE_ENV: "production", DATABASE_SSL_MODE: "disable" },
    { DATABASE_SSL_MODE: "require" },
    { NEXT_PUBLIC_DATABASE_URL: "private-sentinel" },
    { DATABASE_URL: "private-sentinel" },
  ])
    assert.throws(
      () => readDatabaseConfiguration({ ...env, ...change }),
      (error: Error) => !error.message.includes("private-sentinel"),
    );
});

test("pool construction is lazy, bounded, and handles idle errors without exposing driver data", async () => {
  const client = createDatabase(env);
  assert.equal(client.pool.totalCount, 0);
  assert.equal(client.pool.options.max, 10);
  client.pool.emit("error", new Error("private-sentinel"));
  assert.equal(client.idleConnectionFailures, 1);
  assert.equal(client.pool.totalCount, 0);
  await client.close();
});

test("health failures contain only sanitized health fields", async () => {
  const client = createDatabase(env);
  client.pool.query = async () => {
    throw new Error("private-sentinel");
  };
  const health = await checkDatabaseHealth(client);
  assert.equal(health.status, "down");
  assert.equal(health.code, "unavailable");
  assert.equal(JSON.stringify(health).includes("private-sentinel"), false);
  await client.close();
});

test("checked-in migrations are additive and snapshots match schema declarations", () => {
  const plan = readMigrationPlan();
  assert.match(plan.fingerprint, /^[0-9a-f]{64}$/);
  assert.ok(plan.migrations.length > 0);
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const lastIndex = journal.entries.length - 1;
  const snapshot = JSON.parse(
    readFileSync(
      `drizzle/meta/${String(lastIndex).padStart(4, "0")}_snapshot.json`,
      "utf8",
    ),
  );
  const current = generateDrizzleJson(schema);
  // Persisted JSON intentionally omits undefined optional metadata properties.
  assert.deepEqual(JSON.parse(JSON.stringify(current.tables)), snapshot.tables);
});

test("migration guard refuses destructive and unreviewed statement shapes", () => {
  for (const statement of [
    'DROP TABLE "users";',
    'TRUNCATE "users";',
    'DELETE FROM "users";',
    'ALTER TABLE "users" DROP COLUMN "email";',
    'ALTER TABLE "users" ALTER COLUMN "email" TYPE integer;',
    'CREATE TABLE "x" (id uuid); DROP TABLE "users";',
    "DO $$ BEGIN END $$;",
    'CREATE INDEX CONCURRENTLY "x" ON "users" ("id");',
  ])
    assert.throws(() => assertAdditiveMigration(statement));
});

test("migration executor refuses target/history/baseline mismatches before any DDL", async () => {
  const plan = readMigrationPlan();
  for (const scenario of [
    "unapproved",
    "wrong_target",
    "locked",
    "unmanaged",
    "changed_history",
  ] as const) {
    const queries: string[] = [];
    const client = {
      async query(query: string) {
        queries.push(query);
        if (query.includes("current_database"))
          return {
            rows: [
              {
                name: scenario === "wrong_target" ? "other" : "velvetbook_test",
              },
            ],
          };
        if (query.includes("pg_try_advisory_lock"))
          return { rows: [{ acquired: scenario !== "locked" }] };
        if (query.includes("to_regclass"))
          return {
            rows: [
              {
                present:
                  scenario === "changed_history"
                    ? "drizzle.__drizzle_migrations"
                    : null,
              },
            ],
          };
        if (query.includes("SELECT hash"))
          return {
            rows: [
              {
                hash: "modified",
                created_at: String(plan.migrations[0].folderMillis),
              },
            ],
          };
        if (query.includes("pg_tables")) return { rows: [{}], rowCount: 1 };
        if (query.includes("pg_advisory_unlock")) return { rows: [] };
        throw new Error("Unexpected query");
      },
    } as unknown as PoolClient;
    await assert.rejects(
      executeMigrationPlan(
        client,
        plan,
        scenario === "unapproved" ? "wrong" : plan.fingerprint,
        "velvetbook_test",
      ),
    );
    assert.equal(
      queries.some((query) => /CREATE|ALTER|INSERT|DELETE|DROP/.test(query)),
      false,
    );
    assert.equal(
      queries.some((query) => query.includes("pg_advisory_unlock")),
      scenario === "unmanaged" || scenario === "changed_history",
    );
  }
});
