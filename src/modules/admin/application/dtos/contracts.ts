import type { AdminReasonCode } from "../../domain/entities/model";

/** Untrusted selectors; no platform grant or verification evidence in request bodies. */
export type AdminScopeSelector =
  | { readonly kind: "organization"; readonly organizationId: string }
  | {
      readonly kind: "organizations";
      readonly organizationIds: readonly string[];
    }
  | { readonly kind: "users"; readonly userIds: readonly string[] }
  | {
      readonly kind: "platform";
      readonly area: "settings" | "platform_audit" | "platform_activity";
    };

export interface AdminAccessRequestDto {
  readonly scope: AdminScopeSelector;
  readonly reasonCode: AdminReasonCode;
  readonly justification: string;
  readonly ticketRef: string | null;
  readonly correlationId: string;
}
