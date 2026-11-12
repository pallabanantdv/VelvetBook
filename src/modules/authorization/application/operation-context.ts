import type { SessionContext } from "@/modules/identity/application/public";
import type { TenantContext } from "./contexts";
import type {
  AuthorizedOperation,
  AuthorizationRequest,
} from "./ports/authorization.server";

/** Future adapters must match subject, tenant, target, action, and freshness on use. */
export interface OrganizationOperationContext {
  readonly session: SessionContext;
  readonly tenant: TenantContext;
  readonly authorization: AuthorizedOperation & {
    readonly request: Extract<AuthorizationRequest, { scope: "organization" }>;
  };
}

/** Customer scope uses self/ownership checks, never fabricated tenant membership. */
export interface CustomerOperationContext {
  readonly session: SessionContext;
  readonly authorization: AuthorizedOperation & {
    readonly request: Extract<AuthorizationRequest, { scope: "customer" }>;
  };
}
