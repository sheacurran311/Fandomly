CREATE TYPE "public"."nft_category" AS ENUM('badge_credential', 'digital_art', 'collectible', 'reward_perk', 'event_ticket', 'custom');--> statement-breakpoint
CREATE TYPE "public"."nft_mint_status" AS ENUM('pending', 'processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."nft_token_type" AS ENUM('ERC721', 'ERC1155', 'SOLANA', 'SOLANA_COMPRESSED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('points_earned', 'task_completed', 'campaign_new', 'campaign_update', 'creator_post', 'creator_update', 'reward_available', 'reward_claimed', 'achievement_unlocked', 'level_up', 'follower_milestone', 'system', 'marketing');--> statement-breakpoint
CREATE TABLE "fandomly_badge_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"requirement_type" text NOT NULL,
	"requirement_data" jsonb,
	"image_url" text NOT NULL,
	"badge_color" text,
	"nft_metadata" jsonb,
	"collection_id" varchar,
	"is_active" boolean DEFAULT true,
	"total_issued" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nft_collections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar,
	"tenant_id" varchar NOT NULL,
	"crossmint_collection_id" text,
	"name" text NOT NULL,
	"description" text,
	"symbol" text,
	"chain" text NOT NULL,
	"contract_address" text,
	"token_type" "nft_token_type" DEFAULT 'ERC721' NOT NULL,
	"is_creator_owned" boolean DEFAULT true,
	"owner_wallet_address" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"deployed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_collections_crossmint_collection_id_unique" UNIQUE("crossmint_collection_id")
);
--> statement-breakpoint
CREATE TABLE "nft_deliveries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mint_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"collection_id" varchar NOT NULL,
	"token_id" text NOT NULL,
	"tx_hash" text NOT NULL,
	"chain" text NOT NULL,
	"contract_address" text NOT NULL,
	"metadata_snapshot" jsonb NOT NULL,
	"is_viewed" boolean DEFAULT false,
	"viewed_at" timestamp,
	"notification_sent" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"delivered_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_deliveries_mint_id_unique" UNIQUE("mint_id")
);
--> statement-breakpoint
CREATE TABLE "nft_mints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crossmint_action_id" text NOT NULL,
	"collection_id" varchar NOT NULL,
	"template_id" varchar,
	"badge_template_id" varchar,
	"recipient_user_id" varchar NOT NULL,
	"recipient_wallet_address" text NOT NULL,
	"recipient_chain" text NOT NULL,
	"mint_reason" text NOT NULL,
	"context_data" jsonb,
	"token_id" text,
	"tx_hash" text,
	"contract_address" text,
	"status" "nft_mint_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_mints_crossmint_action_id_unique" UNIQUE("crossmint_action_id")
);
--> statement-breakpoint
CREATE TABLE "nft_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "nft_category" DEFAULT 'custom' NOT NULL,
	"metadata" jsonb NOT NULL,
	"mint_price" integer DEFAULT 0,
	"max_supply" integer,
	"current_supply" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_draft" boolean DEFAULT true,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tenant_id" varchar,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"sent_via" jsonb DEFAULT '{"push":true,"email":false,"sms":false}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"points" integer DEFAULT 50 NOT NULL,
	"required_fields" jsonb DEFAULT '[]'::jsonb,
	"social_platform" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_announcements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"creator_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'update' NOT NULL,
	"metadata" jsonb,
	"is_pinned" boolean DEFAULT false,
	"is_published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "program_id" varchar;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "public_page_settings" jsonb DEFAULT '{"showAbout":true,"showTasks":true,"showSocialPosts":true,"showAnalytics":false,"showRewards":true,"showCommunity":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD COLUMN "page_config" jsonb;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "program_id" varchar;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "campaign_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb DEFAULT '{"marketing":{"push":true,"email":true,"sms":false},"campaignUpdates":{"push":true,"email":true,"sms":false},"creatorUpdates":{"push":true,"email":false,"sms":false},"newTasks":{"push":true,"email":true,"sms":false},"newRewards":{"push":true,"email":true,"sms":false},"achievementAlerts":{"push":true,"email":false,"sms":false},"weeklyDigest":false,"monthlyReport":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "fandomly_badge_templates" ADD CONSTRAINT "fandomly_badge_templates_collection_id_nft_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."nft_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_collections" ADD CONSTRAINT "nft_collections_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_collections" ADD CONSTRAINT "nft_collections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_deliveries" ADD CONSTRAINT "nft_deliveries_mint_id_nft_mints_id_fk" FOREIGN KEY ("mint_id") REFERENCES "public"."nft_mints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_deliveries" ADD CONSTRAINT "nft_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_deliveries" ADD CONSTRAINT "nft_deliveries_collection_id_nft_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."nft_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_mints" ADD CONSTRAINT "nft_mints_collection_id_nft_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."nft_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_mints" ADD CONSTRAINT "nft_mints_template_id_nft_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."nft_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_mints" ADD CONSTRAINT "nft_mints_badge_template_id_fandomly_badge_templates_id_fk" FOREIGN KEY ("badge_template_id") REFERENCES "public"."fandomly_badge_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_mints" ADD CONSTRAINT "nft_mints_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_templates" ADD CONSTRAINT "nft_templates_collection_id_nft_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."nft_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_templates" ADD CONSTRAINT "nft_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_announcements" ADD CONSTRAINT "program_announcements_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_announcements" ADD CONSTRAINT "program_announcements_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;