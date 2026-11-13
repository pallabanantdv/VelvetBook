CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_metadata_object_check" CHECK (jsonb_typeof("audit_logs"."metadata") = 'object'),
	CONSTRAINT "audit_labels_check" CHECK (length(btrim("audit_logs"."action")) > 0 and length(btrim("audit_logs"."subject_type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"service_id" uuid,
	"product_id" uuid,
	"staff_id" uuid,
	"name_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"duration_minutes" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_org_store_booking_id_unique" UNIQUE("organization_id","store_id","booking_id","id"),
	CONSTRAINT "items_window_check" CHECK ((
      "booking_items"."kind" = 'service' and "booking_items"."starts_at" is not null and "booking_items"."ends_at" is not null and "booking_items"."ends_at" > "booking_items"."starts_at"
    ) or ("booking_items"."kind" = 'product' and "booking_items"."starts_at" is null and "booking_items"."ends_at" is null)),
	CONSTRAINT "items_kind_check" CHECK ((
    "booking_items"."kind" = 'service' and "booking_items"."service_id" is not null and "booking_items"."product_id" is null and "booking_items"."quantity" = 1 and "booking_items"."duration_minutes" is not null and "booking_items"."duration_minutes" > 0
  ) or (
    "booking_items"."kind" = 'product' and "booking_items"."product_id" is not null and "booking_items"."service_id" is null and "booking_items"."staff_id" is null and "booking_items"."duration_minutes" is null and "booking_items"."quantity" > 0
  )),
	CONSTRAINT "items_price_check" CHECK ("booking_items"."unit_price" >= 0 and "booking_items"."unit_price" <> 'NaN'::numeric)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"deal_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"policy_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_customer_request_unique" UNIQUE("customer_user_id","idempotency_key"),
	CONSTRAINT "bookings_org_store_id_customer_unique" UNIQUE("organization_id","store_id","id","customer_user_id"),
	CONSTRAINT "bookings_org_store_id_unique" UNIQUE("organization_id","store_id","id"),
	CONSTRAINT "bookings_org_id_currency_unique" UNIQUE("organization_id","id","currency"),
	CONSTRAINT "bookings_revision_check" CHECK ("bookings"."revision" > 0),
	CONSTRAINT "bookings_request_check" CHECK (length("bookings"."idempotency_key") > 0 and "bookings"."request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "bookings_policy_check" CHECK (jsonb_typeof("bookings"."policy_snapshot") = 'object'),
	CONSTRAINT "bookings_hold_check" CHECK ("bookings"."status" <> 'pending' or ("bookings"."hold_expires_at" is not null and "bookings"."hold_expires_at" > "bookings"."created_at")),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired', 'no_show')),
	CONSTRAINT "bookings_window_check" CHECK ("bookings"."ends_at" > "bookings"."starts_at"),
	CONSTRAINT "bookings_total_check" CHECK ("bookings"."total_amount" >= 0 and "bookings"."total_amount" <> 'NaN'::numeric),
	CONSTRAINT "bookings_currency_check" CHECK ("bookings"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"locale" text NOT NULL,
	"timezone" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profiles_user_unique" UNIQUE("user_id"),
	CONSTRAINT "customer_profiles_revision_check" CHECK ("customer_profiles"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"percentage" numeric(5, 2),
	"amount" numeric(14, 2),
	"currency" char(3),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_org_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "deals_org_code_unique" UNIQUE("organization_id","code"),
	CONSTRAINT "deals_code_check" CHECK ("deals"."code" ~ '^[A-Z0-9_-]+$'),
	CONSTRAINT "deals_window_check" CHECK ("deals"."ends_at" is null or "deals"."ends_at" > "deals"."starts_at"),
	CONSTRAINT "deals_value_check" CHECK ((
    "deals"."kind" = 'percentage' and "deals"."percentage" is not null and "deals"."percentage" > 0 and "deals"."percentage" <= 100 and "deals"."amount" is null and "deals"."currency" is null
  ) or (
    "deals"."kind" = 'fixed' and "deals"."amount" is not null and "deals"."amount" > 0 and "deals"."amount" <> 'NaN'::numeric and "deals"."currency" is not null and "deals"."currency" ~ '^[A-Z]{3}$' and "deals"."percentage" is null
  ))
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_customer_store_unique" UNIQUE("customer_user_id","organization_id","store_id")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_org_user_unique" UNIQUE("organization_id","user_id"),
	CONSTRAINT "members_org_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "members_role_check" CHECK ("organization_members"."role" in ('owner', 'manager', 'staff', 'member')),
	CONSTRAINT "members_status_check" CHECK ("organization_members"."status" in ('active', 'suspended', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_revision_check" CHECK ("organizations"."revision" > 0),
	CONSTRAINT "organizations_slug_check" CHECK ("organizations"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "organizations_status_check" CHECK ("organizations"."status" in ('active', 'suspended', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"status" text DEFAULT 'initiating' NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_account_ref" varchar(128) NOT NULL,
	"refund_status" text DEFAULT 'none' NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"provider_payment_id" text,
	"idempotency_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_org_idempotency_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "payments_provider_reference_unique" UNIQUE("provider","provider_account_ref","provider_payment_id"),
	CONSTRAINT "payments_request_check" CHECK (length(btrim("payments"."idempotency_key")) > 0),
	CONSTRAINT "payments_provider_check" CHECK (length(btrim("payments"."provider")) > 0 and length(btrim("payments"."provider_account_ref")) > 0 and ("payments"."provider_payment_id" is null or length(btrim("payments"."provider_payment_id")) > 0)),
	CONSTRAINT "payments_revision_check" CHECK ("payments"."revision" > 0),
	CONSTRAINT "payments_fingerprint_check" CHECK ("payments"."request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payments_refund_status_check" CHECK ("payments"."refund_status" in ('none','pending','partially_refunded','refunded','failed')),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" > 0 and "payments"."amount" <> 'NaN'::numeric),
	CONSTRAINT "payments_currency_check" CHECK ("payments"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('initiating', 'pending', 'succeeded', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_org_store_id_unique" UNIQUE("organization_id","store_id","id"),
	CONSTRAINT "products_store_sku_unique" UNIQUE("organization_id","store_id","sku"),
	CONSTRAINT "products_revision_check" CHECK ("products"."revision" > 0),
	CONSTRAINT "products_sku_check" CHECK (length(btrim("products"."sku")) > 0),
	CONSTRAINT "products_price_check" CHECK ("products"."price" >= 0 and "products"."price" <> 'NaN'::numeric),
	CONSTRAINT "products_currency_check" CHECK ("products"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_unique" UNIQUE("organization_id","booking_id"),
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_body_check" CHECK (length(btrim("reviews"."body")) between 1 and 5000),
	CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" in ('pending','published','rejected','withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_org_store_id_unique" UNIQUE("organization_id","store_id","id"),
	CONSTRAINT "services_revision_check" CHECK ("services"."revision" > 0),
	CONSTRAINT "services_duration_check" CHECK ("services"."duration_minutes" > 0),
	CONSTRAINT "services_price_check" CHECK ("services"."price" >= 0 and "services"."price" <> 'NaN'::numeric),
	CONSTRAINT "services_currency_check" CHECK ("services"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"organization_member_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_org_store_id_unique" UNIQUE("organization_id","store_id","id"),
	CONSTRAINT "staff_store_member_unique" UNIQUE("organization_id","store_id","organization_member_id"),
	CONSTRAINT "staff_revision_check" CHECK ("staff"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"slug" varchar(100) NOT NULL,
	"timezone" text NOT NULL,
	"address" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_org_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "stores_org_slug_unique" UNIQUE("organization_id","slug"),
	CONSTRAINT "stores_revision_check" CHECK ("stores"."revision" > 0),
	CONSTRAINT "stores_slug_check" CHECK ("stores"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "stores_timezone_check" CHECK (length(btrim("stores"."timezone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"display_name" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_trimmed_check" CHECK ("users"."email" = btrim("users"."email") and length("users"."email") > 0)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "items_booking_fk" FOREIGN KEY ("organization_id","store_id","booking_id") REFERENCES "public"."bookings"("organization_id","store_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "items_service_fk" FOREIGN KEY ("organization_id","store_id","service_id") REFERENCES "public"."services"("organization_id","store_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "items_product_fk" FOREIGN KEY ("organization_id","store_id","product_id") REFERENCES "public"."products"("organization_id","store_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "items_staff_fk" FOREIGN KEY ("organization_id","store_id","staff_id") REFERENCES "public"."staff"("organization_id","store_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_store_fk" FOREIGN KEY ("organization_id","store_id") REFERENCES "public"."stores"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_deal_fk" FOREIGN KEY ("organization_id","deal_id") REFERENCES "public"."deals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_store_fk" FOREIGN KEY ("organization_id","store_id") REFERENCES "public"."stores"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_currency_fk" FOREIGN KEY ("organization_id","booking_id","currency") REFERENCES "public"."bookings"("organization_id","id","currency") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_fk" FOREIGN KEY ("organization_id","store_id") REFERENCES "public"."stores"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_customer_fk" FOREIGN KEY ("organization_id","store_id","booking_id","customer_user_id") REFERENCES "public"."bookings"("organization_id","store_id","id","customer_user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_store_fk" FOREIGN KEY ("organization_id","store_id") REFERENCES "public"."stores"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_store_fk" FOREIGN KEY ("organization_id","store_id") REFERENCES "public"."stores"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_member_fk" FOREIGN KEY ("organization_id","organization_member_id") REFERENCES "public"."organization_members"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_org_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "audit_logs" USING btree ("organization_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "items_staff_window_idx" ON "booking_items" USING btree ("organization_id","store_id","staff_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "items_booking_idx" ON "booking_items" USING btree ("organization_id","store_id","booking_id");--> statement-breakpoint
CREATE INDEX "items_service_idx" ON "booking_items" USING btree ("organization_id","store_id","service_id");--> statement-breakpoint
CREATE INDEX "items_product_idx" ON "booking_items" USING btree ("organization_id","store_id","product_id");--> statement-breakpoint
CREATE INDEX "items_staff_idx" ON "booking_items" USING btree ("organization_id","store_id","staff_id");--> statement-breakpoint
CREATE INDEX "bookings_hold_expiry_idx" ON "bookings" USING btree ("status","hold_expires_at");--> statement-breakpoint
CREATE INDEX "bookings_store_start_idx" ON "bookings" USING btree ("organization_id","store_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_customer_start_idx" ON "bookings" USING btree ("customer_user_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_deal_idx" ON "bookings" USING btree ("organization_id","deal_id");--> statement-breakpoint
CREATE INDEX "favorites_store_idx" ON "favorites" USING btree ("organization_id","store_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("organization_id","booking_id","currency");--> statement-breakpoint
CREATE INDEX "reviews_booking_customer_idx" ON "reviews" USING btree ("organization_id","store_id","booking_id","customer_user_id");--> statement-breakpoint
CREATE INDEX "reviews_store_created_idx" ON "reviews" USING btree ("organization_id","store_id","created_at");--> statement-breakpoint
CREATE INDEX "staff_member_idx" ON "staff" USING btree ("organization_id","organization_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_ci_uidx" ON "users" USING btree (lower("email"));