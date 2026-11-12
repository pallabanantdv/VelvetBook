import type { Identifier, OrganizationId, StoreId } from "@/core/identifiers";

/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface BusinessPhoto {
  readonly id: Identifier<"BusinessPhoto">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId | null;
  readonly assetId: Identifier<"MediaAsset">;
  readonly altText: string;
  readonly sortOrder: number;
  readonly moderation: "pending" | "approved" | "rejected";
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
