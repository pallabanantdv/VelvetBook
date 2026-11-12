/** UTC instants representing a half-open [startsAt, endsAt) interval. No arithmetic. */
export interface TimeRange {
  readonly startsAt: Date;
  readonly endsAt: Date;
}
