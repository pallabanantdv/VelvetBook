import type {
  StaffId,
  OrganizationId,
  StoreId,
  MembershipId,
} from "@/core/identifiers";

/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface StaffAssignment {
  readonly id: StaffId;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly membershipId: MembershipId;
  readonly archivedAt: Date | null;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
