import type { Identifier } from "./identifiers";

export type RequestId = Identifier<"Request">;
export type CorrelationId = Identifier<"Correlation">;
/** Diagnostic context only; request/correlation headers never establish authority. */
export interface RequestContext {
  readonly requestId: RequestId;
  readonly correlationId: CorrelationId;
  readonly startedAt: Date;
  readonly traceId?: string;
}
