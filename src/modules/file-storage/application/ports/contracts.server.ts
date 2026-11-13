import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";

import type {
  StoredAsset,
  UploadConstraints,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface StorageProviderPort {
  createUploadIntent(input: {
    readonly context: IntegrationCallContext;
    readonly asset: StoredAsset;
    readonly constraints: UploadConstraints;
  }): Promise<
    Result<
      {
        readonly uploadUrl: string;
        readonly requiredHeaders: Readonly<Record<string, string>>;
        readonly expiresAt: Date;
      },
      IntegrationFailure
    >
  >;
  inspect(input: {
    readonly context: IntegrationCallContext;
    readonly assetId: StoredAsset["id"];
    readonly objectKey: string;
  }): Promise<
    Result<
      {
        readonly bytes: number;
        readonly mediaType: string;
        readonly sha256: string;
      },
      IntegrationFailure
    >
  >;
  issueReadGrant(input: {
    readonly context: IntegrationCallContext;
    readonly asset: StoredAsset;
    readonly expiresAt: Date;
  }): Promise<
    Result<
      { readonly url: string; readonly expiresAt: Date },
      IntegrationFailure
    >
  >;
  delete(input: {
    readonly context: IntegrationCallContext;
    readonly asset: StoredAsset;
  }): Promise<Result<void, IntegrationFailure>>;
}
export interface AssetInspectionPort {
  inspectQuarantined(input: {
    readonly context: IntegrationCallContext;
    readonly asset: StoredAsset;
  }): Promise<
    Result<
      {
        readonly scan: "clean" | "rejected";
        readonly detectedMediaType: string;
        readonly sha256: string;
      },
      IntegrationFailure
    >
  >;
}
