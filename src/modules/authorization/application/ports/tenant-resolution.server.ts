import "server-only";

import type { Result } from "@/core/results";
import type { SessionContext } from "@/modules/identity/application/public";
import type { TenantContext, PlatformContext } from "../contexts";

export interface AccessContextFailure {
  readonly code: "access_denied" | "access_verification_unavailable";
}

export interface TenantResolutionPort {
  /** Selector is untrusted. Verify current subject membership and active organization. */
  resolve(input: {
    readonly session: SessionContext;
    readonly organizationSelector: string;
  }): Promise<Result<TenantContext, AccessContextFailure>>;
}

export interface PlatformAccessPort {
  /** A local active platform grant and sufficiently fresh MFA are mandatory. */
  resolve(input: {
    readonly session: SessionContext;
  }): Promise<Result<PlatformContext, AccessContextFailure>>;
}
