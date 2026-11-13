export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}
export interface GeocodedPlace {
  readonly providerPlaceRef: string | null;
  readonly formattedAddress: string;
  readonly coordinates: Coordinates;
  readonly accuracy: "rooftop" | "approximate" | "unknown";
}
export interface GeocodeQuery {
  readonly address: string;
  readonly locale: string;
  readonly countryCode: string | null;
}
