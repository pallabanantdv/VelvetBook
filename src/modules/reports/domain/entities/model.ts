import type { Identifier } from "@/core/identifiers";
export type ReportKind =
  "bookings" | "payments" | "active_businesses" | "platform_activity";
export interface ReportWindow {
  readonly from: Date;
  readonly to: Date;
  readonly timezone: "UTC";
}
export type ReportMetrics =
  | {
      readonly kind: "bookings";
      readonly counts: {
        readonly pending: number;
        readonly confirmed: number;
        readonly inProgress: number;
        readonly completed: number;
        readonly cancelled: number;
        readonly expired: number;
        readonly noShow: number;
      };
    }
  | {
      readonly kind: "payments";
      readonly amountsByCurrency: readonly {
        readonly currency: string;
        readonly succeededGross: string;
        readonly succeededRefunds: string;
        readonly net: string;
      }[];
      readonly pendingCount: number;
      readonly failedCount: number;
    }
  | {
      readonly kind: "active_businesses";
      readonly activeOrganizationCount: number;
      readonly activeStoreCount: number;
    }
  | {
      readonly kind: "platform_activity";
      readonly countsByAction: readonly {
        readonly action: string;
        readonly count: number;
      }[];
    };
export interface ReportSnapshot {
  readonly id: Identifier<"ReportSnapshot">;
  readonly window: ReportWindow;
  readonly metrics: ReportMetrics;
  readonly sourceWatermark: Date;
  readonly generatedAt: Date;
  readonly definitionVersion: string;
  readonly scopeFingerprint: string;
}
export interface ReportExport {
  readonly id: Identifier<"ReportExport">;
  readonly snapshotId: Identifier<"ReportSnapshot">;
  readonly state: "requested" | "ready" | "failed" | "expired";
  readonly privateAssetRef: Identifier<"MediaAsset"> | null;
  readonly expiresAt: Date;
}
