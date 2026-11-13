import "server-only";
import { z } from "zod";
import type { CustomerProfileInputDto } from "../application/dtos/contracts";
const preferences = z.strictObject({
  theme: z.enum(["system", "light", "dark"]),
  bookingReminders: z.boolean(),
});
const locale = z.string().min(2).max(35).refine((value) => {
  try { return Intl.getCanonicalLocales(value).length === 1; } catch { return false; }
}).transform((value) => Intl.getCanonicalLocales(value)[0]);
const timezone = z.string().min(1).max(100).regex(/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)*$/).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}).nullable();
const fields = {
  displayName: z.string().trim().min(1).max(200),
  locale,
  timezone,
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
  avatarReference: z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/).nullable(),
  preferences,
};
export const customerProfileInputSchema = z.strictObject(fields) satisfies z.ZodType<CustomerProfileInputDto>;
export const customerProfilePatchSchema = z.strictObject({
  ...z.strictObject(fields).partial().shape,
  preferences: preferences.partial().refine((value) => Object.keys(value).length > 0).optional(),
  expectedRevision: z.number().int().min(0).max(2147483646),
}).refine((value) => Object.keys(value).some((key) => key !== "expectedRevision"), "At least one editable field is required.")
  .refine((value) => value.expectedRevision !== 0 || value.displayName !== undefined, "Creating a profile requires displayName.");
