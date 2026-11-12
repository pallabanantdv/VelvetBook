export interface CustomerProfileInputDto {
  readonly displayName: string;
  readonly locale: string;
  readonly timezone: string | null;
}
export interface CustomerProfileDto extends CustomerProfileInputDto {
  readonly id: string;
  readonly userId: string;
  readonly revision: number;
}
