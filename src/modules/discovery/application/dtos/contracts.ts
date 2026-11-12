export interface DiscoverySearchDto {
  readonly location:
    | { readonly kind: "text"; readonly query: string }
    | {
        readonly kind: "radius";
        readonly latitude: number;
        readonly longitude: number;
        readonly radiusKm: number;
      };
  readonly categoryIds: readonly string[];
  readonly price: {
    readonly minimum: string | null;
    readonly maximum: string | null;
    readonly currency: string;
  } | null;
  readonly availability: {
    readonly after: string;
    readonly before: string;
    readonly serviceId: string;
  } | null;
  readonly sort:
    | "relevance"
    | "distance"
    | "price_asc"
    | "price_desc"
    | "rating"
    | "soonest";
  readonly cursor: string | null;
  readonly limit: number;
}
