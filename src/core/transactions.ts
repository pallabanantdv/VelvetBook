import type { ApplicationError } from "./errors";
import type { Identifier, OrganizationId } from "./identifiers";
import type { RequestContext } from "./request-context";
import type { Result } from "./results";

declare const activeTransaction: unique symbol;
export interface TransactionContext {
  readonly [activeTransaction]: true;
  readonly transactionId: Identifier<"Transaction">;
  readonly organizationId: OrganizationId | null;
  readonly request: RequestContext;
}
export type TransactionScope =
  | { readonly kind: "organization"; readonly organizationId: OrganizationId }
  | { readonly kind: "platform" };
export type TransactionFailure = ApplicationError<
  "transaction_unavailable" | "transaction_conflict" | "transaction_failed"
>;
/** Database-only callback. Failure rolls back; any retry repeats the entire callback. */
export interface TransactionManager {
  run<Value, Failure>(input: {
    readonly scope: TransactionScope;
    readonly request: RequestContext;
    readonly isolation: "read_committed" | "serializable";
    readonly maximumRetries: number;
    readonly idempotencyKey: string;
    readonly work: (
      context: TransactionContext,
    ) => Promise<Result<Value, Failure>>;
  }): Promise<Result<Value, Failure | TransactionFailure>>;
}
