CREATE TYPE "public"."referral_status" AS ENUM('pending', 'active', 'completed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reward_frequency" AS ENUM('one_time', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."task_ownership" AS ENUM('platform', 'creator');--> statement-breakpoint
CREATE TYPE "public"."task_section" AS ENUM('user_onboarding', 'social_engagement', 'community_building', 'content_creation', 'streaming_music', 'token_activity', 'custom');--> statement-breakpoint
CREATE TYPE "public"."update_cadence" AS ENUM('immediate', 'daily', 'weekly', 'monthly');--> statement-breakpoint
ALTER TYPE "public"."reward_type" ADD VALUE 'multiplier';--> statement-breakpoint
ALTER TYPE "public"."social_platform" ADD VALUE 'system';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'check_in' BEFORE 'follow';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'follower_milestone' BEFORE 'follow';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'complete_profile' BEFORE 'follow';--> statement-breakpoint
CREATE TABLE "creator_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referring_creator_id" varchar NOT NULL,
	"referred_creator_id" varchar,
	"referral_code" varchar(50) NOT NULL,
	"referral_url" text NOT NULL,
	"click_count" integer DEFAULT 0,
	"signup_date" timestamp,
	"first_paid_date" timestamp,
	"total_revenue_generated" numeric(10, 2) DEFAULT '0',
	"total_commission_earned" numeric(10, 2) DEFAULT '0',
	"commission_percentage" numeric(5, 2) DEFAULT '10.00',
	"status" "referral_status" DEFAULT 'active',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "creator_referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "creator_task_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar NOT NULL,
	"task_id" varchar,
	"campaign_id" varchar,
	"referring_fan_id" varchar NOT NULL,
	"referred_fan_id" varchar,
	"referral_code" varchar(100) NOT NULL,
	"referral_url" text NOT NULL,
	"referral_type" varchar(20) NOT NULL,
	"click_count" integer DEFAULT 0,
	"signup_date" timestamp,
	"joined_creator_date" timestamp,
	"completed_task_date" timestamp,
	"total_creator_points_earned" integer DEFAULT 0,
	"share_percentage" numeric(5, 2) DEFAULT '0',
	"share_expires_at" timestamp,
	"status" "referral_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "creator_task_referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "fan_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referring_fan_id" varchar NOT NULL,
	"referred_fan_id" varchar,
	"referral_code" varchar(50) NOT NULL,
	"referral_url" text NOT NULL,
	"click_count" integer DEFAULT 0,
	"signup_date" timestamp,
	"first_task_completed_at" timestamp,
	"profile_completed_at" timestamp,
	"total_points_referred_user_earned" integer DEFAULT 0,
	"total_points_referrer_earned" integer DEFAULT 0,
	"percentage_rewards_enabled" boolean DEFAULT false,
	"percentage_value" numeric(5, 2) DEFAULT '0',
	"percentage_expires_at" timestamp,
	"status" "referral_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fan_referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "reward_distributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"task_completion_id" varchar,
	"tenant_id" varchar NOT NULL,
	"reward_type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'default',
	"reason" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"progress" integer DEFAULT 0,
	"completion_data" jsonb,
	"points_earned" integer DEFAULT 0,
	"total_rewards_earned" integer DEFAULT 0,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"last_activity_at" timestamp DEFAULT now(),
	"verified_at" timestamp,
	"verification_method" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "reward_value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "verification_data" jsonb DEFAULT '{"profileComplete":false,"requiredFieldsFilled":[],"completionPercentage":0}'::jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "ownership_level" "task_ownership" DEFAULT 'creator' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "section" "task_section" DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "start_time" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "end_time" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "hide_from_ui" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "points_to_reward" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "point_currency" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "multiplier_value" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "currencies_to_apply" jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "apply_to_existing_balance" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "update_cadence" "update_cadence" DEFAULT 'immediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reward_frequency" "reward_frequency" DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "custom_settings" jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_draft" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "creator_referrals" ADD CONSTRAINT "creator_referrals_referring_creator_id_creators_id_fk" FOREIGN KEY ("referring_creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_referrals" ADD CONSTRAINT "creator_referrals_referred_creator_id_creators_id_fk" FOREIGN KEY ("referred_creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_task_referrals" ADD CONSTRAINT "creator_task_referrals_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_task_referrals" ADD CONSTRAINT "creator_task_referrals_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_task_referrals" ADD CONSTRAINT "creator_task_referrals_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_task_referrals" ADD CONSTRAINT "creator_task_referrals_referring_fan_id_users_id_fk" FOREIGN KEY ("referring_fan_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_task_referrals" ADD CONSTRAINT "creator_task_referrals_referred_fan_id_users_id_fk" FOREIGN KEY ("referred_fan_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_referrals" ADD CONSTRAINT "fan_referrals_referring_fan_id_users_id_fk" FOREIGN KEY ("referring_fan_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_referrals" ADD CONSTRAINT "fan_referrals_referred_fan_id_users_id_fk" FOREIGN KEY ("referred_fan_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_task_completion_id_task_completions_id_fk" FOREIGN KEY ("task_completion_id") REFERENCES "public"."task_completions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;