import "server-only";

import type { Identifier, OrganizationId } from "@/core/identifiers";
import type { RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { Onboarding } from "../../domain/entities/model";
import type { OnboardingReviewContext } from "./workflow.server";

/** Explicit platform-review persistence boundary, never fake tenant membership. */
export interface OnboardingReviewRepository {
  findById(input: {
    readonly context: OnboardingReviewContext;
    readonly organizationId: OrganizationId;
    readonly onboardingId: Identifier<"Onboarding">;
  }): Promise<Result<Onboarding | null, RepositoryFailure>>;
  saveReview(input: {
    readonly context: OnboardingReviewContext;
    readonly organizationId: OrganizationId;
    readonly entity: Onboarding;
    readonly expectedRevision: number;
  }): Promise<Result<Onboarding, RepositoryFailure>>;
}
