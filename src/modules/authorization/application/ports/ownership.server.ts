import "server-only";

import type {
  OrganizationId,
  StaffId,
  StoreId,
  UserId,
} from "@/core/identifiers";
import type { Result } from "@/core/results";
import type { SessionContext } from "@/modules/identity/application/public";
import type { AccessContextFailure } from "./tenant-resolution.server";
import type { TenantContext, PlatformContext } from "../contexts";

declare const verifiedOwnership: unique symbol;

export type ResourceKind =
  | "admin"
  | "moderation"
  | "report"
  | "platform_setting"
  | "discovery"
  | "availability"
  | "favorite"
  | "negotiation"
  | "review"
  | "conversation"
  | "deal"
  | "onboarding"
  | "profile"
  | "organization"
  | "membership"
  | "store"
  | "catalog"
  | "staff"
  | "booking"
  | "payment"
  | "audit"
  | "user";

/** Server-loaded facts, not a permission grant; bind to subject and verify scope again. */
export interface ResourceOwnership {
  readonly [verifiedOwnership]: true;
  readonly subjectId: UserId;
  readonly resourceKind: ResourceKind;
  readonly resourceId: string;
  readonly organizationId: OrganizationId | null;
  readonly storeId: StoreId | null;
  readonly ownerUserId: UserId | null;
  readonly assignedStaffIds: readonly StaffId[];
  readonly verifiedAt: Date;
}

export interface OwnershipVerificationPort {
  /** Existing resources: customer queries must bind to user; tenant queries to verified tenant. */
  verify(
    input: (
      | { readonly scope: "customer"; readonly session: SessionContext }
      | {
          readonly scope: "organization";
          readonly session: SessionContext;
          readonly tenant: TenantContext;
        }
      | { readonly scope: "platform"; readonly platform: PlatformContext }
    ) & {
      readonly resource: { readonly kind: ResourceKind; readonly id: string };
    },
  ): Promise<Result<ResourceOwnership, AccessContextFailure>>;
}
