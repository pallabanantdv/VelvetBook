export interface ReviewInputDto {
  readonly bookingId: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly body: string;
}
