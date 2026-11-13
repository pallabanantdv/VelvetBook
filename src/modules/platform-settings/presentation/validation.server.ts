import "server-only";
import { z } from "zod";
import type { PlatformSettingChangeDto } from "../application/dtos/contracts";

/** Proposed input bounds only; does not approve/apply a setting or load runtime config. */
export const platformSettingChangeSchema = z.union([
  z.strictObject({
    key: z.literal("booking.hold_minutes"),
    value: z.number().int().min(1).max(120),
    expectedRevision: z.number().int().min(1),
  }),
  z.strictObject({
    key: z.literal("booking.maximum_advance_days"),
    value: z.number().int().min(1).max(730),
    expectedRevision: z.number().int().min(1),
  }),
  z.strictObject({
    key: z.literal("moderation.review_required"),
    value: z.boolean(),
    expectedRevision: z.number().int().min(1),
  }),
  z.strictObject({
    key: z.literal("notifications.marketing_enabled"),
    value: z.boolean(),
    expectedRevision: z.number().int().min(1),
  }),
]) satisfies z.ZodType<PlatformSettingChangeDto>;
