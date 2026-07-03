CREATE TYPE "public"."crop_category" AS ENUM('leafy', 'herb', 'brassica', 'legume', 'cereal', 'other');--> statement-breakpoint
CREATE TABLE "crops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scientific_name" text,
	"category" "crop_category",
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crops_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "crop_id" integer;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "light_ppfd" integer;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "light_hours" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "germination_temp_c" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "germination_rh_pct" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "fertigation_temp_c" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "fertigation_rh_pct" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "ec_target" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "ph_target_min" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "ph_target_max" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "expected_yield_per_tray_kg" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "seed_density_grams_per_tray" numeric;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD COLUMN "tray_type" text;--> statement-breakpoint
ALTER TABLE "growth_profiles" ADD CONSTRAINT "growth_profiles_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE set null ON UPDATE no action;