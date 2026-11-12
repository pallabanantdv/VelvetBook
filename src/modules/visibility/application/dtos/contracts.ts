/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface BusinessVisibilityDraftDto {
  readonly requestedMode: "hidden" | "unlisted" | "listed";
  readonly bookingEnabled: boolean;
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface BusinessVisibilityViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: BusinessVisibilityDraftDto;
}
