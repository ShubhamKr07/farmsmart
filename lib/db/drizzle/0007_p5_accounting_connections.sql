CREATE TYPE "public"."accounting_provider" AS ENUM('quickbooks');--> statement-breakpoint
CREATE TABLE "accounting_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"provider" "accounting_provider" DEFAULT 'quickbooks' NOT NULL,
	"realm_id" text NOT NULL,
	"company_name" text,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_connections_user_provider_uniq" ON "accounting_connections" USING btree ("clerk_user_id","provider");