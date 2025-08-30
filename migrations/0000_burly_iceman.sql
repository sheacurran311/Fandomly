CREATE TYPE "public"."campaign_status" AS ENUM('active', 'inactive', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."campaign_trigger" AS ENUM('schedule_daily', 'schedule_weekly', 'schedule_monthly', 'birthday', 'anniversary', 'purchase_transaction', 'return_transaction', 'internal_event', 'custom_event', 'achievement_earned', 'redemption_code');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('automation', 'direct', 'referral');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('basic', 'premium', 'vip');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'inactive', 'suspended', 'trial');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('fandomly_admin', 'customer_admin', 'customer_end_user');--> statement-breakpoint
CREATE TABLE "campaign_participations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"participation_count" integer DEFAULT 1,
	"last_participation" timestamp DEFAULT now(),
	"total_units_earned" integer DEFAULT 0,
	"participation_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"rule_order" integer DEFAULT 1 NOT NULL,
	"conditions" jsonb NOT NULL,
	"effects" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"creator_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer,
	"campaign_type" "campaign_type" NOT NULL,
	"trigger" "campaign_trigger" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'everyone' NOT NULL,
	"visibility_rules" jsonb,
	"custom_attributes" jsonb,
	"transaction_filters" jsonb,
	"global_budget" integer,
	"per_member_limit" jsonb,
	"total_issued" integer DEFAULT 0,
	"total_participants" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"category" text NOT NULL,
	"follower_count" integer DEFAULT 0,
	"brand_colors" jsonb,
	"social_links" jsonb,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fan_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"fan_id" varchar NOT NULL,
	"program_id" varchar NOT NULL,
	"current_points" integer DEFAULT 0,
	"total_points_earned" integer DEFAULT 0,
	"current_tier" text,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"creator_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"points_name" text DEFAULT 'Points',
	"tiers" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"fan_program_id" varchar NOT NULL,
	"points" integer NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_redemptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"fan_id" varchar NOT NULL,
	"reward_id" varchar NOT NULL,
	"points_spent" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"redemption_data" jsonb,
	"redeemed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"program_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"reward_type" text NOT NULL,
	"reward_data" jsonb,
	"max_redemptions" integer,
	"current_redemptions" integer DEFAULT 0,
	"required_tier" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"member_data" jsonb DEFAULT '{"points":0,"tier":"basic"}'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_active_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"owner_id" varchar NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'starter' NOT NULL,
	"subscription_status" text DEFAULT 'trial',
	"branding" jsonb,
	"business_info" jsonb,
	"limits" jsonb,
	"usage" jsonb DEFAULT '{"currentMembers":0,"currentCampaigns":0,"currentRewards":0,"apiCallsThisMonth":0,"storageUsed":0}'::jsonb,
	"billing_info" jsonb,
	"settings" jsonb DEFAULT '{"timezone":"UTC","currency":"USD","language":"en","nilCompliance":false,"publicProfile":true,"allowRegistration":true,"requireEmailVerification":false,"enableSocialLogin":true}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dynamic_user_id" text,
	"email" text,
	"username" text,
	"avatar" text,
	"wallet_address" text,
	"wallet_chain" text,
	"user_type" text DEFAULT 'fan' NOT NULL,
	"current_tenant_id" varchar,
	"role" "user_role" DEFAULT 'customer_end_user' NOT NULL,
	"customer_tier" "customer_tier" DEFAULT 'basic',
	"onboarding_state" jsonb DEFAULT '{"currentStep":0,"totalSteps":5,"completedSteps":[],"isCompleted":false}'::jsonb,
	"admin_permissions" jsonb,
	"customer_admin_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_dynamic_user_id_unique" UNIQUE("dynamic_user_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rules" ADD CONSTRAINT "campaign_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_programs" ADD CONSTRAINT "fan_programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_programs" ADD CONSTRAINT "fan_programs_fan_id_users_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_programs" ADD CONSTRAINT "fan_programs_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_fan_program_id_fan_programs_id_fk" FOREIGN KEY ("fan_program_id") REFERENCES "public"."fan_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_fan_id_users_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;