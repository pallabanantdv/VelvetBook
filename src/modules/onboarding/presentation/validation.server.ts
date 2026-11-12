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
