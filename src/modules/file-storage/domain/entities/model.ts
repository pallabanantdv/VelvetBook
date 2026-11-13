import type { Identifier, OrganizationId } from "@/core/identifiers";
export type StoredAssetPolicy =
  | {
      readonly purpose: "business_photo";
      readonly access: "private" | "public_derivative";
    }
  | { readonly purpose: "document"; readonly access: "private" };
export interface StoredAsset {
  readonly id: Identifier<"MediaAsset">;
  readonly organizationId: OrganizationId;
  readonly objectKey: string;
  readonly policy: StoredAssetPolicy;
  readonly mediaType: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly state: "planned" | "quarantined" | "ready" | "rejected" | "deleted";
  readonly createdAt: Date;
}
export interface UploadConstraints {
  readonly mediaTypes: readonly string[];
  readonly maximumBytes: number;
  readonly sha256: string;
  readonly expiresAt: Date;
}
