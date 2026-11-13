import type { Identifier, UserId } from "@/core/identifiers";
/** Closed registry: credentials, role grants, URLs and arbitrary executable config are excluded. */
export interface PlatformSettingValues {
  readonly "booking.hold_minutes": number;
  readonly "booking.maximum_advance_days": number;
  readonly "moderation.review_required": boolean;
  readonly "notifications.marketing_enabled": boolean;
}
export type PlatformSettingKey = keyof PlatformSettingValues;
export type PlatformSettingChange = {
  [K in PlatformSettingKey]: {
    readonly key: K;
    readonly value: PlatformSettingValues[K];
    readonly expectedRevision: number;
  };
}[PlatformSettingKey];
export interface PlatformSettingSnapshot {
  readonly values: PlatformSettingValues;
  readonly revision: number;
  readonly effectiveAt: Date;
}
export interface PlatformSettingChangeRequest {
  readonly id: Identifier<"SettingChangeRequest">;
  readonly change: PlatformSettingChange;
  readonly requestedBy: UserId;
  readonly approvedBy: UserId | null;
  readonly state: "proposed" | "approved" | "rejected" | "applied" | "expired";
  readonly revision: number;
  readonly createdAt: Date;
}
