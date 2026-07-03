CREATE TYPE "public"."bad_tray_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."sensor_type" AS ENUM('temp', 'ph', 'water', 'humidity', 'ec');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reason" AS ENUM('purchase', 'consume', 'adjust');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('seed', 'transplant', 'harvest', 'inspect');--> statement-breakpoint
CREATE TABLE "bad_tray_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"tray_id" integer,
	"issue" text,
	"severity" "bad_tray_severity",
	"full_trays" integer DEFAULT 0 NOT NULL,
	"half_trays" integer DEFAULT 0 NOT NULL,
	"photo_urls" text[] DEFAULT '{}' NOT NULL,
	"loss_estimate" numeric,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_seed_lots" (
	"cycle_id" integer NOT NULL,
	"seed_lot_id" integer NOT NULL,
	"qty" numeric,
	CONSTRAINT "cycle_seed_lots_cycle_id_seed_lot_id_pk" PRIMARY KEY("cycle_id","seed_lot_id")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sensor_id" integer NOT NULL,
	"metric" text NOT NULL,
	"value" numeric NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensors" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer,
	"rack_id" integer,
	"type" "sensor_type" NOT NULL,
	"label" text NOT NULL,
	"unit" text,
	"last_value" numeric,
	"last_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sensors_placement" CHECK ("sensors"."channel_id" IS NOT NULL OR "sensors"."rack_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"cycle_id" integer,
	"delta" numeric NOT NULL,
	"reason" "stock_movement_reason" DEFAULT 'adjust' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer,
	"type" "task_type" NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"assignee" text,
	"due_at" timestamp,
	"completed_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cycles" ADD COLUMN "tray_id" integer;--> statement-breakpoint
ALTER TABLE "cycles" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cycles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "facility_id" integer;--> statement-breakpoint
ALTER TABLE "seed_lots" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "cycle_id" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "bad_tray_entries" ADD CONSTRAINT "bad_tray_entries_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bad_tray_entries" ADD CONSTRAINT "bad_tray_entries_tray_id_trays_id_fk" FOREIGN KEY ("tray_id") REFERENCES "public"."trays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_seed_lots" ADD CONSTRAINT "cycle_seed_lots_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_seed_lots" ADD CONSTRAINT "cycle_seed_lots_seed_lot_id_seed_lots_id_fk" FOREIGN KEY ("seed_lot_id") REFERENCES "public"."seed_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_sensor_id_sensors_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_rack_id_racks_id_fk" FOREIGN KEY ("rack_id") REFERENCES "public"."racks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bad_tray_entries_cycle_id_idx" ON "bad_tray_entries" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "bad_tray_entries_created_at_idx" ON "bad_tray_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sensor_readings_sensor_id_idx" ON "sensor_readings" USING btree ("sensor_id");--> statement-breakpoint
CREATE INDEX "sensor_readings_read_at_brin" ON "sensor_readings" USING brin ("read_at");--> statement-breakpoint
CREATE INDEX "sensors_channel_id_idx" ON "sensors" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "sensors_rack_id_idx" ON "sensors" USING btree ("rack_id");--> statement-breakpoint
CREATE INDEX "stock_movements_inventory_item_id_idx" ON "stock_movements" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_due_at_idx" ON "tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "tasks_cycle_id_idx" ON "tasks" USING btree ("cycle_id");--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_tray_id_trays_id_fk" FOREIGN KEY ("tray_id") REFERENCES "public"."trays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;