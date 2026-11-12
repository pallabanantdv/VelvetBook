export type {
  OperatingHours,
  TimeInterval,
  DayHours,
  DateHours,
} from "../domain/entities/model";
export type {
  OperatingHoursDraftDto,
  OperatingHoursViewDto,
} from "./dtos/contracts";
export type { OperatingHoursRepository } from "./ports/repository.server";
export type { ManageOperatingHoursPort } from "./use-cases/manage.server";
