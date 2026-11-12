import type {
  Identifier,
  OrganizationId,
  StoreId,
  UserId,
  BookingId,
} from "@/core/identifiers";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export interface Review {
  readonly id: Identifier<"Review">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly bookingId: BookingId;
  readonly customerUserId: UserId;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly body: string;
  readonly status: "pending" | "published" | "rejected" | "withdrawn";
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
