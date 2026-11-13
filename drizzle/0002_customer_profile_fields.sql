ALTER TABLE "customer_profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "avatar_reference" text;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "preferences" jsonb DEFAULT '{"theme":"system","bookingReminders":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_phone_check" CHECK ("customer_profiles"."phone" is null or "customer_profiles"."phone" ~ '^+[1-9][0-9]{6,14}$');--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_avatar_check" CHECK ("customer_profiles"."avatar_reference" is null or (length("customer_profiles"."avatar_reference") <= 128 and "customer_profiles"."avatar_reference" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'));--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_preferences_check" CHECK (jsonb_typeof("customer_profiles"."preferences") = 'object'
      and "customer_profiles"."preferences" ?& array['theme','bookingReminders']
      and ("customer_profiles"."preferences" - 'theme' - 'bookingReminders') = '{}'::jsonb
      and jsonb_typeof("customer_profiles"."preferences"->'theme') = 'string'
      and "customer_profiles"."preferences"->>'theme' in ('system','light','dark')
      and jsonb_typeof("customer_profiles"."preferences"->'bookingReminders') = 'boolean');