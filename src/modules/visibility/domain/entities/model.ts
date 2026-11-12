import type { Identifier, OrganizationId, StoreId } from "@/core/identifiers";

/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface BusinessVisibility {
  readonly id: Identifier<"BusinessVisibility">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly requestedMode: "hidden" | "unlisted" | "listed";
  readonly bookingEnabled: boolean;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
