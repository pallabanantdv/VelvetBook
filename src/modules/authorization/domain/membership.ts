import type {
  MembershipId,
  OrganizationId,
  StaffId,
  StoreId,
  UserId,
} from "@/core/identifiers";

/** Authoritative membership record; never populated from a request role field. */
export interface Membership {
  readonly membershipId: MembershipId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: "owner" | "manager" | "staff" | "member";
  readonly status: "active" | "suspended" | "revoked";
}

export interface StaffAssignment {
  readonly staffId: StaffId;
  readonly storeId: StoreId;
  readonly membershipId: MembershipId;
  readonly organizationId: OrganizationId;
}
