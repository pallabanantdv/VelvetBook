import type { RequestContext } from "./request-context";

/** Stable, low-cardinality labels; no tenant/user/email/event identifiers as metric labels. */
export interface MetricLabels {
  readonly operation: string;
  readonly dependency?:
    "database" | "payments" | "storage" | "email" | "events";
  readonly outcome?: "success" | "failure" | "denied";
}
export interface MetricsRecorder {
  increment(
    name: "request.completed" | "dependency.failure",
    labels: MetricLabels,
    amount?: number,
  ): void;
  observe(
    name: "request.duration_ms" | "dependency.duration_ms",
    labels: MetricLabels,
    value: number,
  ): void;
  gauge(
    name: "outbox.lag_seconds" | "retry.queue_depth",
    labels: MetricLabels,
    value: number,
  ): void;
}
export interface TraceSpan {
  record(input: {
    readonly event: string;
    readonly outcome: "success" | "failure" | "denied";
    readonly errorCode?: string;
  }): void;
  end(outcome: "success" | "failure" | "denied"): void;
}
export interface Tracer {
  start(input: {
    readonly name: string;
    readonly request: RequestContext;
  }): TraceSpan;
}
