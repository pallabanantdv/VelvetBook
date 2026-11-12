import type { StoreId, OrganizationId } from "@/core/identifiers";

/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface Store {
  readonly id: StoreId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly address: string | null;
  readonly archivedAt: Date | null;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
