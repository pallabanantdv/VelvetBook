CREATE TABLE "auth_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credentials_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "auth_mfa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sealed_secret" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"last_accepted_step" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mfa_user_unique" UNIQUE("user_id"),
	CONSTRAINT "mfa_step_check" CHECK ("auth_mfa"."last_accepted_step" >= 0)
);
--> statement-breakpoint
CREATE TABLE "auth_password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resets_token_unique" UNIQUE("token_hash"),
	CONSTRAINT "resets_hash_check" CHECK ("auth_password_resets"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "resets_expiry_check" CHECK ("auth_password_resets"."expires_at" > "auth_password_resets"."created_at")
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_key" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_bucket_unique" UNIQUE("bucket_key"),
	CONSTRAINT "rate_hits_check" CHECK ("auth_rate_limits"."hits" > 0)
);
--> statement-breakpoint
CREATE TABLE "auth_reset_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reset_id" uuid NOT NULL,
	"sealed_proof" text NOT NULL,
	"delivered_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reset_delivery_unique" UNIQUE("reset_id"),
	CONSTRAINT "reset_delivery_attempts_check" CHECK ("auth_reset_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"mfa_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessions_hash_check" CHECK ("auth_sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_expiry_check" CHECK ("auth_sessions"."expires_at" > "auth_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "platform_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'platform_admin' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_grant_user_unique" UNIQUE("user_id"),
	CONSTRAINT "platform_grant_role_check" CHECK ("platform_grants"."role" = 'platform_admin'),
	CONSTRAINT "platform_grant_status_check" CHECK ("platform_grants"."status" in ('active','revoked'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_mfa" ADD CONSTRAINT "auth_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_password_resets" ADD CONSTRAINT "auth_password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_reset_deliveries" ADD CONSTRAINT "auth_reset_deliveries_reset_id_auth_password_resets_id_fk" FOREIGN KEY ("reset_id") REFERENCES "public"."auth_password_resets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_grants" ADD CONSTRAINT "platform_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resets_user_idx" ON "auth_password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resets_expiry_idx" ON "auth_password_resets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rate_window_idx" ON "auth_rate_limits" USING btree ("window_started_at");--> statement-breakpoint
CREATE INDEX "reset_delivery_pending_idx" ON "auth_reset_deliveries" USING btree ("delivered_at","lease_until");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "auth_sessions" USING btree ("expires_at");