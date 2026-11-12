import type { OrganizationId, UserId } from "@/core/identifiers";
import type { SessionContext } from "@/modules/identity/application/public";
import type { Membership, StaffAssignment } from "../domain/membership";

declare const verifiedTenant: unique symbol;
declare const verifiedPlatform: unique symbol;

/** Resolved for this authenticated subject, not deserialized from the client. */
export interface TenantContext {
  readonly [verifiedTenant]: true;
  readonly subjectId: UserId;
  readonly organizationId: OrganizationId;
  readonly organizationStatus: "active";
  readonly membership: Membership & { readonly status: "active" };
  readonly staffAssignments: readonly StaffAssignment[];
  readonly verifiedAt: Date;
}

/** Separate grant, loaded server-side. No implicit organization membership. */
export interface PlatformContext {
  readonly [verifiedPlatform]: true;
  readonly session: SessionContext;
  readonly grant: {
    readonly subjectId: UserId;
    readonly role: "platform_admin";
    readonly status: "active";
    readonly verifiedAt: Date;
  };
}
