import type { FieldValidationIssue } from "@/core/errors";
import type { CorrelationId, RequestId } from "@/core/request-context";

export interface ResponseMetadata {
  readonly requestId: RequestId;
  readonly correlationId: CorrelationId;
}
export type PublicErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "ACCESS_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INTERNAL_ERROR";
export interface ApiSuccess<Data> {
  readonly ok: true;
  readonly data: Data;
  readonly meta: ResponseMetadata;
}
export interface ApiFailure {
  readonly ok: false;
  readonly error: {
    readonly code: PublicErrorCode;
    readonly message: string;
    readonly issues?: readonly FieldValidationIssue[];
  };
  readonly meta: ResponseMetadata;
}
export type ApiResponse<Data> = ApiSuccess<Data> | ApiFailure;
