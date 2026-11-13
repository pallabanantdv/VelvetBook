import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";

/** Deliberately narrow additive-DDL guard, not a SQL parser/security sandbox. */
export function assertAdditiveMigration(statement: string): void {
  const sql = statement.trim().replace(/;$/, "");
  if (!sql) return;
  const allowed =
    /^(CREATE TABLE "[a-z_]+"\s*\(|CREATE (UNIQUE )?INDEX "[a-z_]+" ON |ALTER TABLE "[a-z_]+" ADD CONSTRAINT "[a-z_]+" (FOREIGN KEY|CHECK|UNIQUE)\s*\(|ALTER TABLE "[a-z_]+" ADD COLUMN "[a-z_]+" (timestamp with time zone|text|integer|boolean|uuid)\b)/i;
  const normalized = sql
    .replace(/ON DELETE RESTRICT/gi, "")
    .replace(/ON UPDATE NO ACTION/gi, "");
  if (
    !allowed.test(sql) ||
    /;|--|\/\*|\$\$/.test(sql) ||
    /\b(DROP|TRUNCATE|DELETE|UPDATE|INSERT|CASCADE|EXECUTE|CALL|COPY|GRANT|REVOKE|DO)\b/i.test(
      normalized,
    )
  ) {
    throw new Error(
      "Migration requires separate manual safety review; automatic execution refused.",
    );
  }
}

export function readMigrationPlan(directory = path.resolve("drizzle")) {
  const journal = JSON.parse(
    readFileSync(path.join(directory, "meta/_journal.json"), "utf8"),
  ) as {
    entries: { idx: number; tag: string; when: number }[];
  };
  if (
    !journal.entries.length ||
    journal.entries.some(
      (entry, index) =>
        entry.idx !== index ||
        !/^\d{4}_[a-z0-9_]+$/.test(entry.tag) ||
        !Number.isSafeInteger(entry.when) ||
        entry.when <= 0 ||
        (index > 0 && entry.when <= journal.entries[index - 1].when),
    )
  )
    throw new Error("Invalid migration journal.");
  const migrations = readMigrationFiles({ migrationsFolder: directory });
  migrations.forEach((entry) => entry.sql.forEach(assertAdditiveMigration));
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        migrations.map(({ hash, folderMillis }) => ({ hash, folderMillis })),
      ),
    )
    .digest("hex");
  return {
    directory,
    fingerprint,
    migrations,
    files: journal.entries.map(({ tag }) => `${tag}.sql`),
  };
}

/** Call only on a dedicated session, never a transaction-pooling endpoint. */
export async function executeMigrationPlan(
  client: PoolClient,
  plan: ReturnType<typeof readMigrationPlan>,
  approvedFingerprint: string,
  expectedDatabaseName: string,
): Promise<void> {
  if (!expectedDatabaseName || approvedFingerprint !== plan.fingerprint) {
    throw new Error(
      "Migration plan fingerprint and target confirmation are required.",
    );
  }
  const target = await client.query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  if (target.rows[0]?.name !== expectedDatabaseName)
    throw new Error("Migration target does not match confirmation.");
  const lock = await client.query<{ acquired: boolean }>(
    "SELECT pg_try_advisory_lock(862301, 1) AS acquired",
  );
  if (!lock.rows[0]?.acquired)
    throw new Error("Another migration process holds the lock.");
  try {
    const exists = await client.query<{ present: string | null }>(
      "SELECT to_regclass('drizzle.__drizzle_migrations')::text AS present",
    );
    let applied: { hash: string; created_at: string }[] = [];
    if (exists.rows[0]?.present) {
      applied = (
        await client.query<{ hash: string; created_at: string }>(
          "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id",
        )
      ).rows;
    }
    if (!applied.length) {
      const existing = await client.query(
        "SELECT 1 FROM pg_tables WHERE schemaname = 'public' LIMIT 1",
      );
      if (existing.rowCount)
        throw new Error(
          "Unmanaged existing tables detected; explicit baseline review required.",
        );
    }
    if (
      applied.length > plan.migrations.length ||
      applied.some(
        (entry, index) =>
          entry.hash !== plan.migrations[index]?.hash ||
          Number(entry.created_at) !== plan.migrations[index]?.folderMillis,
      )
    )
      throw new Error("Migration history differs from checked-in files.");
    // Drizzle executes pending DDL and migration journal writes transactionally.
    await migrate(drizzle(client), { migrationsFolder: plan.directory });
  } finally {
    await client.query("SELECT pg_advisory_unlock(862301, 1)");
  }
}
