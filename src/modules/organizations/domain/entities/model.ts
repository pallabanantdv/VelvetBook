import type { OrganizationId } from "@/core/identifiers";

/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly status: "active" | "suspended" | "closed";
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
