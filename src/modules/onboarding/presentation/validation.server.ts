import "server-only";
import { z } from "zod";
import type { OnboardingDraftDto } from "../application/dtos/contracts";
import type {
  OnboardingSectionEnvelopeDto,
  OnboardingReviewDecisionDto,
} from "../application/dtos/sections";

export const onboardingSectionEnvelopeSchema = z.strictObject({
  section: z.enum([
    "organization",
    "photos",
    "services",
    "products",
    "staff",
    "visibility",
    "review",
  ]),
  payload: z.unknown(),
}) satisfies z.ZodType<OnboardingSectionEnvelopeDto>;

export const onboardingReviewDecisionSchema = z.discriminatedUnion("decision", [
  z.strictObject({ decision: z.literal("approved") }),
  z.strictObject({
    decision: z.literal("rejected"),
    reason: z.string().trim().min(1).max(4000),
  }),
]) satisfies z.ZodType<OnboardingReviewDecisionDto>;

/** Structural validation only, not ownership or domain invariant validation. */
export const onboardingDraftSchema = z.strictObject({
  selectedStoreIds: z.array(z.uuid()).min(1).max(100),
}) satisfies z.ZodType<OnboardingDraftDto>;

export const workflowIdSchema = z.uuid();
export const workflowIdempotencySchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
export const workflowRevisionSchema = z.strictObject({ expectedRevision: z.number().int().min(1).max(2147483646) });
export const selectedStoresSchema = z.strictObject({
  ...workflowRevisionSchema.shape,
  selectedStoreIds: z.array(z.uuid()).min(1).max(100).refine((ids) => new Set(ids).size === ids.length).transform((ids) => [...ids].sort()),
});
const currentPassword = z.string().min(1).max(72).refine((value) => new TextEncoder().encode(value).length <= 72);
export const proposeOnboardingDecisionSchema = z.strictObject({ ...workflowRevisionSchema.shape,
  decision: z.enum(["approved", "rejected"]), reason: z.string().trim().min(1).max(4000), password: currentPassword });
export const applyOnboardingDecisionSchema = z.strictObject({ ...workflowRevisionSchema.shape, password: currentPassword });
