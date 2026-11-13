import type { Identifier, UserId } from "@/core/identifiers";

export interface CustomerPreferences {
  readonly theme: "system" | "light" | "dark";
  readonly bookingReminders: boolean;
}
export interface CustomerProfile {
  readonly id: Identifier<"CustomerProfile">;
  readonly userId: UserId;
  readonly displayName: string;
  readonly locale: string;
  readonly timezone: string | null;
  readonly phone: string | null;
  /** Opaque presentation reference only; never a private asset access grant. */
  readonly avatarReference: string | null;
  readonly preferences: CustomerPreferences;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
