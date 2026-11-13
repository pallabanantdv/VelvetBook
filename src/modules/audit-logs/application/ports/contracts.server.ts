import "server-only";
import type { Result } from "@/core/results";
import type {
  AdminFailure,
  AdminOperationContext,
  SensitiveAdminContext,
} from "@/modules/admin/application/public";
import type {
  AuditEvent,
  AuditWriteContext,
} from "../../domain/entities/model";
import type { AuditSearchDto, AuditExportDto } from "../dtos/contracts";

/** Proposed contracts only; exact permission, scope and fingerprint must match on use. */
export type AuditReadContext = AdminOperationContext<{
  readonly scope: "platform";
  readonly resource: "audit";
  readonly action: "read";
}>;
export type AuditExportContext = SensitiveAdminContext<{
  readonly scope: "platform";
  readonly resource: "audit";
  readonly action: "export";
}>;
export interface AuditAppendPort {
  append(input: {
    readonly context: AuditWriteContext;
    readonly event: AuditEvent;
  }): Promise<
    Result<
      { readonly eventId: AuditEvent["id"]; readonly recordedAt: Date },
      AdminFailure
    >
  >;
}
export interface AuditQueryPort {
  search(input: {
    readonly context: AuditReadContext;
    readonly filter: AuditSearchDto;
  }): Promise<
    Result<
      {
        readonly events: readonly AuditEvent[];
        readonly nextCursor: string | null;
      },
      AdminFailure
    >
  >;
}
export interface AuditExportPort {
  request(input: {
    readonly context: AuditExportContext;
    readonly filter: AuditExportDto;
  }): Promise<
    Result<
      { readonly exportRef: string; readonly expiresAt: Date },
      AdminFailure
    >
  >;
}
