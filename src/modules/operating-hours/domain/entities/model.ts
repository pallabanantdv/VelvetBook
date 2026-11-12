import type {
  Identifier,
  OrganizationId,
  StoreId,
  StaffId,
} from "@/core/identifiers";

export interface TimeInterval {
  readonly startMinute: number;
  readonly endMinute: number;
}
export interface DayHours {
  readonly day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly intervals: readonly TimeInterval[];
}
export interface DateHours {
  readonly date: string;
  readonly intervals: readonly TimeInterval[];
}
/** Proposed entity shape; no constructors or invariant handlers yet. */
export interface OperatingHours {
  readonly id: Identifier<"OperatingHours">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly subject:
    | { readonly kind: "store" }
    | { readonly kind: "staff"; readonly staffId: StaffId };
  readonly timezone: string;
  readonly weekly: readonly DayHours[];
  readonly exceptions: readonly DateHours[];
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
