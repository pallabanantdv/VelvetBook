export interface AvailabilityRequestDto {
  readonly storeId: string;
  readonly serviceIds: readonly string[];
  readonly staffId: string | null;
  readonly after: string;
  readonly before: string;
  readonly units: number;
}
export interface AvailabilitySlotDto {
  readonly startsAt: string;
  readonly endsAt: string;
  readonly staffId: string | null;
  readonly observedAt: string;
  readonly snapshotVersion: string;
}
