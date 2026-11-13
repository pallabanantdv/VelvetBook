import "server-only";
import type { Result } from "@/core/results";
import type {
  AdminFailure,
  AdminOperationContext,
  PreparedAdminActionContext,
  SensitiveAdminContext,
} from "@/modules/admin/application/public";
import type {
  PlatformSettingSnapshot,
  PlatformSettingChangeRequest,
} from "../../domain/entities/model";
import type { PlatformSettingChangeDto } from "../dtos/contracts";

/** Proposed contracts only; exact permission, scope and fingerprint must match on use. */
export type SettingsReadContext = AdminOperationContext<{
  readonly scope: "platform";
  readonly resource: "platform_setting";
  readonly action: "read";
}>;
export type SettingsProposeContext = PreparedAdminActionContext<{
  readonly scope: "platform";
  readonly resource: "platform_setting";
  readonly action: "propose";
}>;
export type SettingsApproveContext = PreparedAdminActionContext<{
  readonly scope: "platform";
  readonly resource: "platform_setting";
  readonly action: "approve";
}>;
export type SettingsApplyContext = SensitiveAdminContext<{
  readonly scope: "platform";
  readonly resource: "platform_setting";
  readonly action: "apply";
}>;
export interface PlatformSettingsRepository {
  read(input: {
    readonly context: SettingsReadContext;
  }): Promise<Result<PlatformSettingSnapshot, AdminFailure>>;
}
export interface PlatformSettingsPort {
  propose(input: {
    readonly context: SettingsProposeContext;
    readonly change: PlatformSettingChangeDto;
  }): Promise<Result<PlatformSettingChangeRequest, AdminFailure>>;
  approve(input: {
    readonly context: SettingsApproveContext;
    readonly changeRequestId: PlatformSettingChangeRequest["id"];
    readonly expectedRevision: number;
  }): Promise<Result<PlatformSettingChangeRequest, AdminFailure>>;
  apply(input: {
    readonly context: SettingsApplyContext;
    readonly changeRequestId: PlatformSettingChangeRequest["id"];
    readonly expectedRevision: number;
  }): Promise<Result<PlatformSettingSnapshot, AdminFailure>>;
}
