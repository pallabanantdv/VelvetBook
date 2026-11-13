import "server-only";
import type { Result } from "@/core/results";
import type {
  AdminFailure,
  AdminOperationContext,
  SensitiveAdminContext,
} from "@/modules/admin/application/public";
import type { ReportSnapshot, ReportExport } from "../../domain/entities/model";
import type {
  ReportRequestDto,
  ReportExportRequestDto,
} from "../dtos/contracts";

/** Proposed contracts only; exact permission, scope and fingerprint must match on use. */
export type ReportReadContext = AdminOperationContext<{
  readonly scope: "platform";
  readonly resource: "report";
  readonly action: "read";
}>;
export type ReportExportContext = SensitiveAdminContext<{
  readonly scope: "platform";
  readonly resource: "report";
  readonly action: "export";
}>;
/** Aggregate projections only: no raw SQL, arbitrary table/field or find-all contract. */
export interface ReportingSourcePort {
  snapshot(input: {
    readonly context: ReportReadContext;
    readonly request: ReportRequestDto;
  }): Promise<Result<ReportSnapshot, AdminFailure>>;
}
export interface ReportsPort {
  request(input: {
    readonly context: ReportReadContext;
    readonly request: ReportRequestDto;
  }): Promise<Result<ReportSnapshot, AdminFailure>>;
}
export interface ReportExportPort {
  request(input: {
    readonly context: ReportExportContext;
    readonly request: ReportExportRequestDto;
  }): Promise<Result<ReportExport, AdminFailure>>;
}
