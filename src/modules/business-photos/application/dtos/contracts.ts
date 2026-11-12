/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface BusinessPhotoDraftDto {
  readonly placement:
    | { readonly kind: "organization" }
    | { readonly kind: "store"; readonly storeId: string };
  readonly assetId: string;
  readonly altText: string;
  readonly sortOrder: number;
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface BusinessPhotoViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: BusinessPhotoDraftDto;
}
