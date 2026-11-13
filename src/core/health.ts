import type { RequestContext } from "./request-context";

export type HealthComponent =
  "configuration" | "database" | "event_delivery" | "storage";
export interface HealthProbeResult {
  readonly component: HealthComponent;
  readonly status: "up" | "degraded" | "down" | "not_configured";
  readonly checkedAt: Date;
  readonly durationMs: number;
  readonly code:
    "ok" | "disabled" | "timeout" | "unavailable" | "invalid_configuration";
}
/** Only explicitly enabled/critical dependencies affect future readiness. No probe implementation. */
export interface HealthProbe {
  readonly component: HealthComponent;
  readonly criticalForReadiness: boolean;
  check(input: {
    readonly request: RequestContext;
    readonly deadlineAt: Date;
  }): Promise<HealthProbeResult>;
}
export interface HealthReport {
  readonly liveness: "alive";
  readonly readiness: "ready" | "not_ready";
  readonly checks: readonly HealthProbeResult[];
  readonly checkedAt: Date;
}
