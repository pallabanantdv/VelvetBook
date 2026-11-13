import type { OrganizationId, UserId } from "./identifiers";
import type { RequestContext } from "./request-context";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export interface LogContext {
  readonly request: RequestContext;
  readonly organizationId?: OrganizationId;
  readonly subjectId?: UserId;
}
/** Closed fields avoid accidental raw error/body/credential spreading. Redaction is still required. */
export interface LogAttributes {
  readonly module?: string;
  readonly operation?: string;
  readonly durationMs?: number;
  readonly outcome?: "success" | "failure" | "denied" | "retry";
  readonly errorCode?: string;
  readonly httpStatus?: number;
  readonly attempt?: number;
  readonly dependency?:
    | "database"
    | "payments"
    | "storage"
    | "email"
    | "sms"
    | "push"
    | "maps"
    | "events";
}
export interface StructuredLogger {
  /** event is a registered stable event name, never interpolated request content. */
  log(input: {
    readonly level: LogLevel;
    readonly event: string;
    readonly context: LogContext;
    readonly attributes: LogAttributes;
  }): void;
  child(context: LogContext): StructuredLogger;
}
