import "server-only";
import type { RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type { StoreId } from "@/core/identifiers";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";
import type { OperatingHours } from "../../domain/entities/model";

/** All reads/writes must bind context tenant AND any store selector. Never implement unscoped lookup. */
export interface OperatingHoursRepository {
  list(input: {
    readonly context: OrganizationOperationContext;
    readonly storeId: StoreId;
    readonly cursor: string | null;
    readonly limit: number;
  }): Promise<
    Result<
      {
        readonly items: readonly OperatingHours[];
        readonly nextCursor: string | null;
      },
      RepositoryFailure
    >
  >;
  findById(input: {
    readonly context: OrganizationOperationContext;
    readonly id: OperatingHours["id"];
    readonly storeId: StoreId;
  }): Promise<Result<OperatingHours | null, RepositoryFailure>>;
  save(input: {
    readonly context: OrganizationOperationContext;
    readonly entity: OperatingHours;
    readonly expectedRevision: number | null;
  }): Promise<Result<OperatingHours, RepositoryFailure>>;
}
