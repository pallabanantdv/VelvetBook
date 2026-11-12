import type {
  Identifier,
  OrganizationId,
  StoreId,
  UserId,
} from "@/core/identifiers";
import type { Money } from "@/core/money";
import type { TimeRange } from "@/core/time";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export type NegotiationState =
  "open" | "accepted" | "declined" | "withdrawn" | "expired";
export interface NegotiationOffer {
  readonly id: Identifier<"NegotiationOffer">;
  readonly threadId: Identifier<"Negotiation">;
  readonly predecessorId: Identifier<"NegotiationOffer"> | null;
  readonly proposer:
    | { readonly kind: "customer"; readonly userId: UserId }
    | { readonly kind: "organization"; readonly userId: UserId };
  readonly amount: Money;
  readonly proposedRange: TimeRange;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}
export interface Negotiation {
  readonly id: Identifier<"Negotiation">;
  readonly organizationId: OrganizationId;
  readonly storeId: StoreId;
  readonly customerUserId: UserId;
  readonly state: NegotiationState;
  readonly offers: readonly NegotiationOffer[];
  readonly currentOfferId: Identifier<"NegotiationOffer"> | null;
  readonly acceptedOfferId: Identifier<"NegotiationOffer"> | null;
  readonly revision: number;
}
