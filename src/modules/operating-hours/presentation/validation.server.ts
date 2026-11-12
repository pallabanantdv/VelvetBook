import "server-only";
import { z } from "zod";
import type { OperatingHoursDraftDto } from "../application/dtos/contracts";
const intervalSchema = z.strictObject({
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
});
/** Structural validation only, not ownership or domain invariant validation. */
export const operatingHoursDraftSchema = z.strictObject({
  subject: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("store") }),
    z.strictObject({ kind: z.literal("staff"), staffId: z.uuid() }),
  ]),
  timezone: z.string().min(1).max(100),
  weekly: z
    .array(
      z.strictObject({
        day: z.union([
          z.literal(0),
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
        ]),
        intervals: z.array(intervalSchema).max(24),
      }),
    )
    .length(7),
  exceptions: z
    .array(
      z.strictObject({
        date: z.iso.date(),
        intervals: z.array(intervalSchema).max(24),
      }),
    )
    .max(366),
}) satisfies z.ZodType<OperatingHoursDraftDto>;
