export type { CustomerProfile, CustomerPreferences } from "../domain/entities/model";
export type {
  CustomerProfileInputDto,
  CustomerProfilePatchDto,
  CustomerProfileDto,
} from "./dtos/contracts";
export type {
  CustomerProfileRepository,
  CustomerProfilePort,
  FeatureFailure,
} from "./ports/contracts.server";
