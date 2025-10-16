CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon_name" varchar(50),
	"points_required" integer,
	"condition" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "emotions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"color" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "emotions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plant_id" varchar,
	"emotion_id" varchar,
	"photo_url" text,
	"audio_url" text,
	"text_entry" text,
	"points_earned" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(100),
	"message" text,
	"type" varchar(50) DEFAULT 'reminder',
	"is_read" boolean DEFAULT false,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(100),
	"type" varchar(100),
	"status" varchar(50) DEFAULT 'growing',
	"planted_at" timestamp DEFAULT now(),
	"first_photo_url" text,
	"latest_photo_url" text,
	"milestones" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"emoji" varchar(10),
	"points_cost" integer NOT NULL,
	"category" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seeds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(100) NOT NULL,
	"origin" varchar(200),
	"photo_url" text,
	"notes" text,
	"share_code" varchar(20),
	"is_shared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "seeds_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"reward_id" varchar NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" varchar(50) NOT NULL,
	"avatar" varchar(100),
	"color_theme" varchar(50) DEFAULT 'green',
	"points" integer DEFAULT 0,
	"days_since_planting" integer DEFAULT 0,
	"age" integer DEFAULT 10 NOT NULL,
	"context" varchar(20) DEFAULT 'home' NOT NULL,
	"role" varchar(20) DEFAULT 'child' NOT NULL,
	"parental_consent" boolean DEFAULT false,
	"parent_email" varchar(255),
	"parental_consent_date" timestamp,
	"consent_verified" boolean DEFAULT false,
	"is_workshop_mode" boolean DEFAULT false,
	"accessibility_settings" json DEFAULT '{"fontSize":"medium"}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_emotion_id_emotions_id_fk" FOREIGN KEY ("emotion_id") REFERENCES "public"."emotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeds" ADD CONSTRAINT "seeds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_alias_idx" ON "users" USING btree ("alias");