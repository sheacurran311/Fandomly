CREATE TYPE "public"."reward_type" AS ENUM('points', 'raffle', 'nft', 'badge');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'spotify', 'apple_music', 'discord', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('twitter_follow', 'twitter_mention', 'twitter_retweet', 'twitter_like', 'twitter_include_name', 'twitter_include_bio', 'twitter_hashtag_post', 'facebook_like_page', 'facebook_like_photo', 'facebook_like_post', 'facebook_share_post', 'facebook_share_page', 'facebook_comment_post', 'facebook_comment_photo', 'instagram_follow', 'instagram_like_post', 'youtube_like', 'youtube_subscribe', 'youtube_share', 'tiktok_follow', 'tiktok_like', 'tiktok_share', 'spotify_follow', 'spotify_playlist', 'spotify_album', 'follow', 'join', 'repost', 'referral');--> statement-breakpoint
ALTER TYPE "public"."campaign_status" ADD VALUE 'pending_tasks';--> statement-breakpoint
CREATE TABLE "creator_facebook_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar NOT NULL,
	"page_id" varchar NOT NULL,
	"name" text NOT NULL,
	"access_token" text NOT NULL,
	"followers_count" integer DEFAULT 0,
	"fan_count" integer DEFAULT 0,
	"instagram_business_account_id" varchar,
	"connected_instagram_account_id" varchar,
	"last_synced_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_campaign_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"platform" "social_platform" NOT NULL,
	"task_type" "task_type" NOT NULL,
	"display_order" integer DEFAULT 1,
	"target_url" text,
	"hashtags" jsonb,
	"invite_code" text,
	"custom_instructions" text,
	"reward_type" "reward_type" DEFAULT 'points' NOT NULL,
	"reward_value" integer DEFAULT 50 NOT NULL,
	"reward_metadata" jsonb,
	"requires_manual_verification" boolean DEFAULT false,
	"verification_instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"platform_user_id" text,
	"platform_username" text,
	"platform_display_name" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"profile_data" jsonb,
	"connected_at" timestamp DEFAULT now(),
	"last_synced_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"display_order" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"custom_reward_value" integer,
	"custom_instructions" text,
	"assigned_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'social' NOT NULL,
	"platform" "social_platform" NOT NULL,
	"task_type" "task_type" NOT NULL,
	"default_config" jsonb,
	"is_global" boolean DEFAULT true NOT NULL,
	"tenant_id" varchar,
	"creator_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"creator_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"task_type" "task_type" NOT NULL,
	"platform" "social_platform" NOT NULL,
	"target_url" text,
	"hashtags" jsonb,
	"invite_code" text,
	"custom_instructions" text,
	"reward_type" "reward_type" DEFAULT 'points' NOT NULL,
	"reward_value" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true,
	"total_completions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "campaign_types" jsonb DEFAULT '["points"]'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "reward_structure" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "prerequisite_campaigns" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "all_tasks_required" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "type_specific_data" jsonb;--> statement-breakpoint
ALTER TABLE "creator_facebook_pages" ADD CONSTRAINT "creator_facebook_pages_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_campaign_tasks" ADD CONSTRAINT "social_campaign_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_campaign_tasks" ADD CONSTRAINT "social_campaign_tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");