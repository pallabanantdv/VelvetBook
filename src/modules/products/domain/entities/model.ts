import type { Identifier, OrganizationId, StoreId } from "@/core/identifiers";
import type { Money } from "@/core/money";

/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface Product {
  readonly id: Identifier<"Product">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: Money;
  readonly deletedAt: Date | null;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
