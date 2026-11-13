import type { CustomerPreferences } from "../../domain/entities/model";

export interface CustomerProfileInputDto {
  readonly displayName: string;
  readonly locale: string;
  readonly timezone: string | null;
  readonly phone: string | null;
  readonly avatarReference: string | null;
  readonly preferences: CustomerPreferences;
}
export type CustomerProfilePatchDto = Partial<Omit<CustomerProfileInputDto, "preferences">> & {
  readonly preferences?: Partial<CustomerPreferences>;
};
export interface CustomerProfileDto extends CustomerProfileInputDto {
  readonly id: string;
  readonly userId: string;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
