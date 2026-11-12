export type { Role, OrganizationRoleName } from "../domain/roles";
export type { Membership, StaffAssignment } from "../domain/membership";
export type {
  Permission,
  CustomerPermission,
  OrganizationPermission,
  PlatformPermission,
} from "../domain/permissions";
export type { TenantContext, PlatformContext } from "./contexts";
export type {
  OrganizationOperationContext,
  CustomerOperationContext,
} from "./operation-context";
export type {
  AccessContextFailure,
  TenantResolutionPort,
  PlatformAccessPort,
} from "./ports/tenant-resolution.server";
export type {
  ResourceKind,
  ResourceOwnership,
  OwnershipVerificationPort,
} from "./ports/ownership.server";
export type {
  AuthorizationTarget,
  AuthorizationRequest,
  AuthorizedOperation,
  AuthorizationPort,
} from "./ports/authorization.server";
