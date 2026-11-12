import type { OrganizationId, StoreId } from "@/core/identifiers";
import type { Money } from "@/core/money";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export interface BusinessSearchResult {
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly name: string;
  readonly timezone: string;
  readonly categoryLabels: readonly string[];
  readonly priceFrom: Money | null;
  readonly averageRating: string | null;
  readonly listingVersion: string;
  readonly observedAt: Date;
}
