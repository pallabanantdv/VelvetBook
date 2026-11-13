import "server-only";
import { performance } from "node:perf_hooks";
import type { HealthProbeResult } from "@/core/health";
import type { DatabaseClient } from "./client.server";

/** Internal connectivity probe only; does not imply schema/application readiness. */
export async function checkDatabaseHealth(
  client: Pick<DatabaseClient, "pool">,
): Promise<HealthProbeResult> {
  const start = performance.now();
  try {
    await client.pool.query("SELECT 1 AS healthy");
    return {
      component: "database",
      status: "up",
      code: "ok",
      checkedAt: new Date(),
      durationMs: Math.round(performance.now() - start),
    };
  } catch {
    return {
      component: "database",
      status: "down",
      code: "unavailable",
      checkedAt: new Date(),
      durationMs: Math.round(performance.now() - start),
    };
  }
}
