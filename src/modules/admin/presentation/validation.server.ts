import "server-only";
import { z } from "zod";
import type { AdminAccessRequestDto } from "../application/dtos/contracts";

export const adminAccessRequestSchema = z.strictObject({
  scope: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("organization"),
      organizationId: z.uuid(),
    }),
    z.strictObject({
      kind: z.literal("organizations"),
      organizationIds: z.array(z.uuid()).min(1).max(100),
    }),
    z.strictObject({
      kind: z.literal("users"),
      userIds: z.array(z.uuid()).min(1).max(100),
    }),
    z.strictObject({
      kind: z.literal("platform"),
      area: z.enum(["settings", "platform_audit", "platform_activity"]),
    }),
  ]),
  reasonCode: z.enum([
    "onboarding_review",
    "account_safety",
    "content_policy",
    "support_investigation",
    "operational_reporting",
    "configuration_change",
  ]),
  justification: z.string().trim().min(20).max(2000),
  ticketRef: z.string().min(1).max(200).nullable(),
  correlationId: z.string().min(1).max(128),
}) satisfies z.ZodType<AdminAccessRequestDto>;
