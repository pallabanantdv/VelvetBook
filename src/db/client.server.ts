import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readDatabaseConfiguration } from "@/config/database.server";
import * as schema from "./schema";

/** Pools connect lazily. Construct once per process, not once per request. */
export function createDatabase(input: Readonly<Record<string, unknown>>) {
  const pool = new Pool(readDatabaseConfiguration(input));
  let idleConnectionFailures = 0;
  // pg requires an idle error listener. Never emit the raw driver error/credentials.
  pool.on("error", () => {
    idleConnectionFailures += 1;
  });
  return {
    pool,
    db: drizzle({ client: pool, schema, logger: false }),
    get idleConnectionFailures() {
      return idleConnectionFailures;
    },
    close: () => pool.end(),
  };
}

export type DatabaseClient = ReturnType<typeof createDatabase>;
const processState = globalThis as typeof globalThis & {
  velvetBookDatabase?: DatabaseClient;
};

/** Explicit lazy bootstrap: importing this module never validates env or opens a socket. */
export function getDatabase(): DatabaseClient {
  return (processState.velvetBookDatabase ??= createDatabase(process.env));
}

/** Call from a worker/server shutdown hook; never after an individual request. */
export async function closeDatabase(): Promise<void> {
  const client = processState.velvetBookDatabase;
  delete processState.velvetBookDatabase;
  await client?.close();
}
