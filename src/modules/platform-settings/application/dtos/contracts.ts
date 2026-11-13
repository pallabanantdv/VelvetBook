export type PlatformSettingChangeDto =
  | {
      readonly key: "booking.hold_minutes" | "booking.maximum_advance_days";
      readonly value: number;
      readonly expectedRevision: number;
    }
  | {
      readonly key:
        "moderation.review_required" | "notifications.marketing_enabled";
      readonly value: boolean;
      readonly expectedRevision: number;
    };
