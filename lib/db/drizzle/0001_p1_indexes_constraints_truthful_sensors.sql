ALTER TABLE "manual_checks" DROP CONSTRAINT "manual_checks_cycle_id_cycles_id_fk";
--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "sensors_online" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "sensors_online" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "sensors_total" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "sensors_total" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "acidity_ph" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "acidity_ph" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "water_level_pct" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "water_level_pct" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "temp_celsius" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "temp_celsius" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "humidity_pct" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_status" ALTER COLUMN "humidity_pct" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_checks" ADD CONSTRAINT "manual_checks_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cycles_closed_at_idx" ON "cycles" USING btree ("closed_at");--> statement-breakpoint
CREATE INDEX "cycles_created_at_idx" ON "cycles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "manual_checks_cycle_id_idx" ON "manual_checks" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shipments_shipping_date_idx" ON "shipments" USING btree ("shipping_date");--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_full_trays_nonneg" CHECK ("cycles"."full_trays" >= 0);--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_half_trays_nonneg" CHECK ("cycles"."half_trays" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_qty_range" CHECK ("inventory_items"."current_qty" <= "inventory_items"."max_qty");