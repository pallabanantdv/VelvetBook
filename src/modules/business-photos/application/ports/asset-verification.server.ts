import "server-only";

import type { Identifier, OrganizationId } from "@/core/identifiers";
import type { ApplicationError } from "@/core/errors";
import type { Result } from "@/core/results";
import type { OrganizationOperationContext } from "@/modules/authorization/application/public";

/** No upload/storage implementation. Future adapter must verify ownership and scanning. */
export interface PhotoAssetVerificationPort {
  verify(input: {
    readonly context: OrganizationOperationContext;
    readonly assetId: Identifier<"MediaAsset">;
  }): Promise<
    Result<
      {
        readonly assetId: Identifier<"MediaAsset">;
        readonly organizationId: OrganizationId;
        readonly mediaType: "image/jpeg" | "image/png" | "image/webp";
        readonly scanStatus: "clean";
        readonly width: number;
        readonly height: number;
      },
      ApplicationError<"invalid_asset" | "access_denied" | "unavailable">
    >
  >;
}
