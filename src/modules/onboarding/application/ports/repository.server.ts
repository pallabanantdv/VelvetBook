import "server-only";
import type { RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type { Onboarding } from "../../domain/entities/model";

/** All reads/writes must bind context tenant AND any store selector. Never implement unscoped lookup. */
export interface OnboardingRepository {
  list(input: {
    readonly context: OrganizationOperationContext;
    readonly cursor: string | null;
    readonly limit: number;
  }): Promise<
    Result<
      {
        readonly items: readonly Onboarding[];
        readonly nextCursor: string | null;
      },
      RepositoryFailure
    >
  >;
  findById(input: {
    readonly context: OrganizationOperationContext;
    readonly id: Onboarding["id"];
  }): Promise<Result<Onboarding | null, RepositoryFailure>>;
  save(input: {
    readonly context: OrganizationOperationContext;
    readonly entity: Onboarding;
    readonly expectedRevision: number | null;
  }): Promise<Result<Onboarding, RepositoryFailure>>;
}
