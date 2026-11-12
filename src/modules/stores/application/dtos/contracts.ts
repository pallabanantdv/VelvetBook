/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface StoreDraftDto {
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly address: string | null;
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface StoreViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: StoreDraftDto;
}
