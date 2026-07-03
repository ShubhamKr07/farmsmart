CREATE TYPE "public"."alert_severity" AS ENUM('critical', 'warning');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('current', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."cycle_status" AS ENUM('germination', 'fertigation', 'harvest', 'completed');--> statement-breakpoint
CREATE TYPE "public"."room_name" AS ENUM('seeding', 'fertigation', 'harvesting');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('in_progress', 'complete', 'pending');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"severity" "alert_severity" DEFAULT 'warning' NOT NULL,
	"status" "alert_status" DEFAULT 'current' NOT NULL,
	"action_type" text,
	"action_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"label" text NOT NULL,
	"position_index" integer DEFAULT 0 NOT NULL,
	"monitoring_api_temp" text,
	"monitoring_api_water_level" text,
	"monitoring_api_ph" text
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_id" text NOT NULL,
	"seed_lot_qr_codes" text[] NOT NULL,
	"seed_name" text NOT NULL,
	"full_trays" integer DEFAULT 0 NOT NULL,
	"half_trays" integer DEFAULT 0 NOT NULL,
	"seed_weight_tray" numeric NOT NULL,
	"growth_profile_id" integer NOT NULL,
	"seeding_date" text NOT NULL,
	"status" "cycle_status" DEFAULT 'germination' NOT NULL,
	"tray_position" text,
	"germination_started_at" timestamp,
	"fertigation_started_at" timestamp,
	"harvest_started_at" timestamp,
	"harvested_qty" numeric,
	"closed_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cycles_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "growth_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"seed_name" text NOT NULL,
	"germination_days" integer NOT NULL,
	"fertigation_days" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"category" text,
	"qr_code" text,
	"current_qty" numeric DEFAULT '0' NOT NULL,
	"max_qty" numeric DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'g' NOT NULL,
	"arrival_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"full_trays" integer DEFAULT 0 NOT NULL,
	"half_trays" integer DEFAULT 0 NOT NULL,
	"is_bad_trays" boolean DEFAULT false NOT NULL,
	"issue" text,
	"notes" text,
	"photo_urls" text[] NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "racks" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"label" text NOT NULL,
	"position_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" "room_name" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rooms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "seed_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"qr_code" text NOT NULL,
	"seed_name" text NOT NULL,
	"supplier" text,
	"product_link" text,
	"item_number" text,
	"vendor_short" text,
	"gpc_code" text,
	"type" text,
	"success" text,
	"grow_time" text,
	"used_in" text,
	"currently_grown" boolean,
	CONSTRAINT "seed_lots_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "sensor_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"sensors_online" integer DEFAULT 24 NOT NULL,
	"sensors_total" integer DEFAULT 24 NOT NULL,
	"acidity_ph" real DEFAULT 6 NOT NULL,
	"water_level_pct" real DEFAULT 95 NOT NULL,
	"temp_celsius" real DEFAULT 30 NOT NULL,
	"humidity_pct" real DEFAULT 65 NOT NULL,
	"nutrient_mix" text
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_id" text NOT NULL,
	"client" text NOT NULL,
	"product_description" text,
	"yield_sold_kg" numeric,
	"revenue_usd" numeric,
	"shipping_date" text,
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "trays" (
	"id" serial PRIMARY KEY NOT NULL,
	"rack_id" integer NOT NULL,
	"label" text NOT NULL,
	"position_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_growth_profile_id_growth_profiles_id_fk" FOREIGN KEY ("growth_profile_id") REFERENCES "public"."growth_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_checks" ADD CONSTRAINT "manual_checks_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racks" ADD CONSTRAINT "racks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trays" ADD CONSTRAINT "trays_rack_id_racks_id_fk" FOREIGN KEY ("rack_id") REFERENCES "public"."racks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cycles_status_idx" ON "cycles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "manual_checks_created_at_idx" ON "manual_checks" USING btree ("created_at");