import type { UserId } from "@/core/identifiers";

/** Canonical local identity; provider claims never assign local privileges. */
export interface UserIdentity {
  readonly userId: UserId;
  readonly status: "active" | "disabled";
  readonly emailVerified: boolean;
}
