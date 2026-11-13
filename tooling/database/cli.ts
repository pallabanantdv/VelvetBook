import "server-only";
import { loadEnvConfig } from "@next/env";
import { createDatabase } from "../../src/db/client.server";
import { checkDatabaseHealth } from "../../src/db/health.server";
import {
  executeMigrationPlan,
  readMigrationPlan,
} from "../../src/db/migrations.server";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info() {},
  error() {},
});

async function main() {
  const command = process.argv[2];
  if (command === "plan") {
    const plan = readMigrationPlan();
    console.log(
      JSON.stringify(
        {
          files: plan.files,
          sha256: plan.fingerprint,
          mode: "offline-review-only",
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command !== "migrate" && command !== "health")
    throw new Error("Unknown database command.");
  if (
    command === "migrate" &&
    (!process.env.MIGRATION_DATABASE_URL ||
      !process.env.MIGRATION_DATABASE_NAME ||
      !process.env.MIGRATION_APPROVED_SHA256)
  ) {
    console.error(
      "Migration refused. Set MIGRATION_DATABASE_URL, MIGRATION_DATABASE_NAME and MIGRATION_APPROVED_SHA256 after reviewing db:migrate:plan and SQL.",
    );
    process.exitCode = 1;
    return;
  }
  const client = createDatabase(
    command === "migrate"
      ? {
          ...process.env,
          DATABASE_ENABLED: "true",
          DATABASE_URL: process.env.MIGRATION_DATABASE_URL,
          DATABASE_POOL_MAX: "1",
          DATABASE_STATEMENT_TIMEOUT_MS: "60000",
        }
      : process.env,
  );
  try {
    if (command === "health") {
      const health = await checkDatabaseHealth(client);
      console.log(JSON.stringify(health));
      if (health.status !== "up") process.exitCode = 1;
    } else {
      const connection = await client.pool.connect();
      try {
        await executeMigrationPlan(
          connection,
          readMigrationPlan(),
          process.env.MIGRATION_APPROVED_SHA256!,
          process.env.MIGRATION_DATABASE_NAME!,
        );
        console.log("Database migrations are up to date.");
      } finally {
        connection.release();
      }
    }
  } finally {
    await client.close();
  }
}

main().catch(() => {
  // No driver errors, raw SQL, credentials or target details in CLI output.
  console.error(
    "Database command failed. Check private configuration, connectivity, migration review and history.",
  );
  process.exitCode = 1;
});
