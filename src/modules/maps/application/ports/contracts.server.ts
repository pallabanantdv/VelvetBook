import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";

import type {
  Coordinates,
  GeocodedPlace,
  GeocodeQuery,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface GeocodingProviderPort {
  geocode(input: {
    readonly context: IntegrationCallContext;
    readonly query: GeocodeQuery;
  }): Promise<Result<readonly GeocodedPlace[], IntegrationFailure>>;
  reverseGeocode(input: {
    readonly context: IntegrationCallContext;
    readonly coordinates: Coordinates;
    readonly locale: string;
  }): Promise<Result<readonly GeocodedPlace[], IntegrationFailure>>;
}
export interface DistanceProviderPort {
  distance(input: {
    readonly context: IntegrationCallContext;
    readonly origin: Coordinates;
    readonly destination: Coordinates;
    readonly mode: "straight_line" | "driving" | "walking";
  }): Promise<
    Result<
      { readonly meters: number; readonly durationSeconds: number | null },
      IntegrationFailure
    >
  >;
}
