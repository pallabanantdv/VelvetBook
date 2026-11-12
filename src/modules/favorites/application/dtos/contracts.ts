export interface FavoriteBusinessInputDto {
  readonly storeId: string;
}
export interface FavoritesPageDto {
  readonly cursor: string | null;
  readonly limit: number;
}
