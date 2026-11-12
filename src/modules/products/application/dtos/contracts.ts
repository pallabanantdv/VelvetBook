/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface ProductDraftDto {
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: { readonly amount: string; readonly currency: string };
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface ProductViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: ProductDraftDto;
}
