export interface PaginationLimits {
  readonly defaultLimit: number;
  readonly maximumLimit: number;
}
/** Cursor is an opaque selector; authenticity/tenant/filter binding is a future adapter responsibility. */
export interface CursorPageRequest {
  readonly cursor: string | null;
  readonly limit: number;
}
export interface CursorPage<Item> {
  readonly items: readonly Item[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}
