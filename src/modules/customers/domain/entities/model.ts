import type { Identifier, UserId } from "@/core/identifiers";

/** Proposed domain data only; no algorithms, transitions, or policy handlers. */
export interface CustomerProfile {
  readonly id: Identifier<"CustomerProfile">;
  readonly userId: UserId;
  readonly displayName: string;
  readonly locale: string;
  readonly timezone: string | null;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
