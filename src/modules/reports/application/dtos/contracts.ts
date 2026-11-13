export interface ReportRequestDto {
  readonly kind:
    "bookings" | "payments" | "active_businesses" | "platform_activity";
  readonly from: string;
  readonly to: string;
  readonly definitionVersion: string;
}
export interface ReportExportRequestDto {
  readonly snapshotId: string;
  readonly format: "csv" | "json";
  readonly expectedScopeFingerprint: string;
}
