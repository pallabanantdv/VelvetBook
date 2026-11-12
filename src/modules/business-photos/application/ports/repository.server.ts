import "server-only";
import type { RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type { BusinessPhoto } from "../../domain/entities/model";

/** All reads/writes must bind context tenant AND any store selector. Never implement unscoped lookup. */
export interface BusinessPhotoRepository {
  list(input: {
    readonly context: OrganizationOperationContext;
    readonly cursor: string | null;
    readonly limit: number;
  }): Promise<
    Result<
      {
        readonly items: readonly BusinessPhoto[];
        readonly nextCursor: string | null;
      },
      RepositoryFailure
    >
  >;
  findById(input: {
    readonly context: OrganizationOperationContext;
    readonly id: BusinessPhoto["id"];
  }): Promise<Result<BusinessPhoto | null, RepositoryFailure>>;
  save(input: {
    readonly context: OrganizationOperationContext;
    readonly entity: BusinessPhoto;
    readonly expectedRevision: number | null;
  }): Promise<Result<BusinessPhoto, RepositoryFailure>>;
}
