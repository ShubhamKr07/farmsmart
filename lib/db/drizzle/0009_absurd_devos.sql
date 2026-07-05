CREATE TYPE "public"."facility_log_type" AS ENUM('maintenance', 'waste', 'env_check', 'cleaning', 'receiving', 'visitor');--> statement-breakpoint
CREATE TABLE "facility_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_type" "facility_log_type" NOT NULL,
	"clerk_user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "facility_logs_type_created_at_idx" ON "facility_logs" USING btree ("log_type","created_at");