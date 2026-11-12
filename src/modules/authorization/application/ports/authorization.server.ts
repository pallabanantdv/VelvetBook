import "server-only";

import type { Result } from "@/core/results";
import type { SessionContext } from "@/modules/identity/application/public";
import type {
  CustomerPermission,
  OrganizationPermission,
  PlatformPermission,
} from "../../domain/permissions";
import type { TenantContext, PlatformContext } from "../contexts";
import type { ResourceKind, ResourceOwnership } from "./ownership.server";

export type AuthorizationTarget =
  | { readonly kind: "existing"; readonly ownership: ResourceOwnership }
  | {
      readonly kind: "collection";
      readonly resourceKind: ResourceKind;
      readonly parent: ResourceOwnership;
    };

/** Creation uses verified parent facts; lists use a verified parent scope, never a wildcard. */
export type AuthorizationRequest =
  | {
      readonly scope: "customer";
      readonly session: SessionContext;
      readonly permission: CustomerPermission;
      readonly target:
        | AuthorizationTarget
        | {
            readonly kind: "customer_collection";
            readonly resourceKind: CustomerPermission["resource"];
          };
    }
  | {
      readonly scope: "organization";
      readonly session: SessionContext;
      readonly tenant: TenantContext;
      readonly permission: OrganizationPermission;
      readonly target: AuthorizationTarget;
    }
  | {
      readonly scope: "platform";
      readonly platform: PlatformContext;
      readonly permission: PlatformPermission;
      readonly target:
        | AuthorizationTarget
        | {
            readonly kind: "platform_collection";
            readonly resourceKind: PlatformPermission["resource"];
          };
    };

declare const authorizedOperation: unique symbol;
export interface AuthorizedOperation {
  readonly [authorizedOperation]: true;
  readonly request: AuthorizationRequest;
  readonly authorizedAt: Date;
}

export interface AuthorizationPort {
  /** Deny unless session, current role, resource, tenant, ownership, and action all match. */
  authorize(request: AuthorizationRequest): Promise<
    Result<
      AuthorizedOperation,
      {
        readonly code: "access_denied" | "authorization_unavailable";
      }
    >
  >;
}
