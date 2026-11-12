/** Proposed two-decimal money representation; validation belongs at boundaries. */
export interface Money {
  readonly amount: string;
  readonly currency: string;
}
