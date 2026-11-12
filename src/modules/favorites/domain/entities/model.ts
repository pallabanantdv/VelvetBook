import type {
  Identifier,
  UserId,
  OrganizationId,
  StoreId,
} from "@/core/identifiers";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export interface FavoriteBusiness {
  readonly id: Identifier<"FavoriteBusiness">;
  readonly customerUserId: UserId;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
