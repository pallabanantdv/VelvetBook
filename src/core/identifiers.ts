declare const identifierBrand: unique symbol;

/** Modules supply a distinct literal name. Construction requires future validation. */
export type Identifier<Name extends string> = string & {
  readonly [identifierBrand]: Name;
};

export type UserId = Identifier<"User">;
export type SessionId = Identifier<"Session">;
export type OrganizationId = Identifier<"Organization">;
export type MembershipId = Identifier<"Membership">;
export type StoreId = Identifier<"Store">;
export type StaffId = Identifier<"Staff">;
export type BookingId = Identifier<"Booking">;
export type BookingItemId = Identifier<"BookingItem">;
export type ServiceId = Identifier<"Service">;
export type ProductId = Identifier<"Product">;
export type DealId = Identifier<"Deal">;
