/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface StaffAssignmentDraftDto {
  readonly membershipId: string;
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface StaffAssignmentViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: StaffAssignmentDraftDto;
}
