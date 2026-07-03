ALTER TABLE "cycles" ALTER COLUMN "seeding_date" SET DATA TYPE date USING "seeding_date"::date;--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "arrival_date" SET DATA TYPE date USING "arrival_date"::date;--> statement-breakpoint
ALTER TABLE "seed_lots" ALTER COLUMN "success" SET DATA TYPE numeric USING NULLIF(trim("success"), '')::numeric;--> statement-breakpoint
ALTER TABLE "seed_lots" ALTER COLUMN "grow_time" SET DATA TYPE numeric USING NULLIF(trim("grow_time"), '')::numeric;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "shipping_date" SET DATA TYPE date USING "shipping_date"::date;
