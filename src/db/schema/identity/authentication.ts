import "server-only";
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { timestamps } from "../common";

export const authCredentials = pgTable(
  "auth_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    passwordHash: text("password_hash").notNull(),
    ...timestamps(),
  },
  (t) => [unique("credentials_user_unique").on(t.userId)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("sessions_token_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expiry_idx").on(t.expiresAt),
    check("sessions_hash_check", sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check("sessions_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
  ],
);

export const authPasswordResets = pgTable(
  "auth_password_resets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("resets_token_unique").on(t.tokenHash),
    index("resets_user_idx").on(t.userId),
    index("resets_expiry_idx").on(t.expiresAt),
    check("resets_hash_check", sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check("resets_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
  ],
);

export const authResetDeliveries = pgTable(
  "auth_reset_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resetId: uuid("reset_id")
      .notNull()
      .references(() => authPasswordResets.id, { onDelete: "restrict" }),
    sealedProof: text("sealed_proof").notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("reset_delivery_unique").on(t.resetId),
    index("reset_delivery_pending_idx").on(t.deliveredAt, t.leaseUntil),
    check("reset_delivery_attempts_check", sql`${t.attempts} >= 0`),
  ],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bucketKey: text("bucket_key").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    hits: integer("hits").default(1).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("rate_bucket_unique").on(t.bucketKey),
    index("rate_window_idx").on(t.windowStartedAt),
    check("rate_hits_check", sql`${t.hits} > 0`),
  ],
);

export const authMfa = pgTable(
  "auth_mfa",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sealedSecret: text("sealed_secret").notNull(),
    confirmed: boolean("confirmed").default(false).notNull(),
    lastAcceptedStep: integer("last_accepted_step").default(0).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("mfa_user_unique").on(t.userId),
    check("mfa_step_check", sql`${t.lastAcceptedStep} >= 0`),
  ],
);

export const platformGrants = pgTable(
  "platform_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role", { enum: ["platform_admin"] })
      .default("platform_admin")
      .notNull(),
    status: text("status", { enum: ["active", "revoked"] })
      .default("active")
      .notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("platform_grant_user_unique").on(t.userId),
    check("platform_grant_role_check", sql`${t.role} = 'platform_admin'`),
    check(
      "platform_grant_status_check",
      sql`${t.status} in ('active','revoked')`,
    ),
  ],
);
