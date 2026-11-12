export interface NegotiationOfferDto {
  readonly threadId: string;
  readonly predecessorId: string | null;
  readonly amount: { readonly amount: string; readonly currency: string };
  readonly startsAt: string;
  readonly endsAt: string;
  readonly expiresAt: string;
  readonly expectedRevision: number;
}
