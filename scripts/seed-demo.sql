-- =============================================================================
-- FarmEasy demo seed data — covers all use cases
-- Run in Replit Shell: psql $DATABASE_URL -f scripts/seed-demo.sql
-- Idempotent: safe to run multiple times.
-- =============================================================================

DO $$
DECLARE
  p_arugula   int;
  p_broccoli  int;
  p_sunflower int;
  p_basil     int;
  p_pea       int;
  p_wheat     int;

  c_germ1  int;
  c_germ2  int;
  c_germ3  int;
  c_fert1  int;
  c_fert2  int;
  c_harv1  int;
  c_harv2  int;
  c_comp1  int;
  c_comp2  int;
  c_comp3  int;
  c_comp4  int;

BEGIN

-- ── 1. GROWTH PROFILES ───────────────────────────────────────────────────────
-- Insert only if a profile with that name doesn't already exist.

INSERT INTO growth_profiles (name, seed_name, germination_days, fertigation_days)
SELECT 'Arugula Normal', 'Arugula', 3, 7
WHERE NOT EXISTS (SELECT 1 FROM growth_profiles WHERE name = 'Arugula Normal');

INSERT INTO growth_profiles (name, seed_name, germination_days, fertigation_days)
SELECT 'Broccoli/Kale', 'Broccoli', 3, 10
WHERE NOT EXISTS (SELECT 1 FROM growth_profiles WHERE name = 'Broccoli/Kale');

INSERT INTO growth_profiles (name, seed_name, germination_days, fertigation_days)
SELECT 'Sunflower', 'Sunflower', 4, 8
WHERE NOT EXISTS (SELECT 1 FROM growth_profiles WHERE name = 'Sunflower');

INSERT INTO growth_profiles (name, seed_name, germination_days, fertigation_days)
SELECT 'Basil Slow', 'Basil', 5, 14
WHERE NOT EXISTS (SELECT 1 FROM growth_profiles WHERE name = 'Basil Slow');

INSERT INTO growth_profiles (name, seed_name, germination_days, fertigation_days)
SELECT 'Pea Shoots', 'Pea Shoots', 3, 7
WHERE NOT EXISTS (SELECT 1 FROM growth_profiles WHERE name = 'Pea Shoots');

INSERT INTO growth_profiles (name, seed_name, germination_days, fertigation_days)
SELECT 'Wheatgrass Fast', 'Wheatgrass', 2, 7
WHERE NOT EXISTS (SELECT 1 FROM growth_profiles WHERE name = 'Wheatgrass Fast');

SELECT id INTO p_arugula   FROM growth_profiles WHERE name = 'Arugula Normal'   LIMIT 1;
SELECT id INTO p_broccoli  FROM growth_profiles WHERE name = 'Broccoli/Kale'    LIMIT 1;
SELECT id INTO p_sunflower FROM growth_profiles WHERE name = 'Sunflower'         LIMIT 1;
SELECT id INTO p_basil     FROM growth_profiles WHERE name = 'Basil Slow'        LIMIT 1;
SELECT id INTO p_pea       FROM growth_profiles WHERE name = 'Pea Shoots'        LIMIT 1;
SELECT id INTO p_wheat     FROM growth_profiles WHERE name = 'Wheatgrass Fast'   LIMIT 1;

-- ── 2. SEED LOTS (simple demo lots that don't need Excel UUIDs) ───────────────
-- Real UUID lots from the Excel import are already in the DB.
-- These extras let cycles reference non-UUID codes too.

INSERT INTO seed_lots (qr_code, seed_name)
SELECT 'QR-SUNFL-DEMO', 'Sunflower' WHERE NOT EXISTS (SELECT 1 FROM seed_lots WHERE qr_code = 'QR-SUNFL-DEMO');
INSERT INTO seed_lots (qr_code, seed_name)
SELECT 'QR-WHEAT-DEMO', 'Wheatgrass' WHERE NOT EXISTS (SELECT 1 FROM seed_lots WHERE qr_code = 'QR-WHEAT-DEMO');
INSERT INTO seed_lots (qr_code, seed_name)
SELECT 'QR-PEA-DEMO', 'Pea Shoots' WHERE NOT EXISTS (SELECT 1 FROM seed_lots WHERE qr_code = 'QR-PEA-DEMO');

-- ── 3. CYCLES (11 cycles, all statuses, realistic timestamps) ─────────────────
--
-- Statuses covered:
--   germination × 3  (fresh × 2, OVERDUE × 1)
--   fertigation × 2  (fresh × 1, OVERDUE × 1)
--   harvest × 2      (single lot × 1, multi-lot × 1)
--   completed × 4    (varying yields and ages)
--
-- Seed lots used:
--   da912c1f → Arugula (JSS)
--   e422c4dd → Broccoli Di Cicco (TLM)
--   81fca68c → Broccoli Waltham 29 (TLM)
--   a2c3840b → Red Rambo radish (JSS)
--   2c9c1036 → Mustard Garnet (JSS)
--   ec3059ce → Bullsblood Beets (JSS)
--   3fa627f7 → Tuscano Kale (JSS)
--   88d167b0 → Cilantro (SGS)
--   dc96b231 → All Star Lettuce (JSS)
--   106fb7a1 → Brush Strokes viola (JSS, Edible Flower)
--   QR-SUNFL-DEMO, QR-WHEAT-DEMO, QR-PEA-DEMO

-- d101 — GERMINATION fresh (day 1 of 3, arugula)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, created_at)
SELECT 'd101', ARRAY['da912c1f-4413-4b13-bc67-2f3902066d87'], 'Arugula',
  4, 1, 145, p_arugula, CURRENT_DATE - 1,
  'germination', 'RACK-A1',
  NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd101');

-- d102 — GERMINATION fresh (day 2 of 3, multi-lot broccoli)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, created_at)
SELECT 'd102', ARRAY['e422c4dd-be13-439a-9d14-41d051b1576d','81fca68c-2918-425d-be4c-bf7f234a386f'],
  'Broccoli', 6, 0, 120, p_broccoli, CURRENT_DATE - 2,
  'germination', 'RACK-B2',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd102');

-- d103 — GERMINATION OVERDUE (6 days in, profile = 3d, 3 days overdue)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, created_at)
SELECT 'd103', ARRAY['a2c3840b-30a5-4d20-ba42-08ae40184213'], 'Red Rambo Radish',
  5, 2, 95, p_arugula, CURRENT_DATE - 6,
  'germination', 'RACK-C3',
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd103');

-- d104 — FERTIGATION fresh (day 4 of 10)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, created_at)
SELECT 'd104', ARRAY['2c9c1036-c962-4f8c-982f-887e413e5713'], 'Mustard Garnet',
  8, 0, 130, p_broccoli, CURRENT_DATE - 7,
  'fertigation', 'RACK-D1',
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd104');

-- d105 — FERTIGATION OVERDUE (15 days in fert, profile = 7d, 8 days overdue)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, created_at)
SELECT 'd105', ARRAY['ec3059ce-03e8-47cb-876a-6ebbb87f3480'], 'Bullsblood Beets',
  3, 3, 110, p_arugula, CURRENT_DATE - 18,
  'fertigation', 'RACK-E4',
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '18 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd105');

-- d106 — HARVEST single lot (kale, no tray position)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status,
  germination_started_at, fertigation_started_at, harvest_started_at, created_at)
SELECT 'd106', ARRAY['3fa627f7-8d02-4166-9625-19604f2b9182'], 'Tuscano Kale',
  10, 0, 160, p_broccoli, CURRENT_DATE - 15,
  'harvest',
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '15 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd106');

-- d107 — HARVEST multi-lot (cilantro + lettuce mix, with tray position)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at, created_at)
SELECT 'd107',
  ARRAY['88d167b0-4425-4772-9f72-748858bbb787','dc96b231-b800-4523-a2aa-62ef98617a38'],
  'Cilantro / Lettuce Mix', 4, 2, 100, p_pea, CURRENT_DATE - 12,
  'harvest', 'RACK-F2',
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '12 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd107');

-- d108 — COMPLETED small yield (basil, 5 days ago)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'd108', ARRAY['QR-SUNFL-DEMO'], 'Sunflower',
  4, 0, 155, p_sunflower, CURRENT_DATE - 18,
  'completed', 'RACK-G3',
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days',
  1850, NOW() - INTERVAL '5 days', NOW() - INTERVAL '18 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd108');

-- d109 — COMPLETED medium yield (wheatgrass, this week)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'd109', ARRAY['QR-WHEAT-DEMO'], 'Wheatgrass',
  8, 2, 175, p_wheat, CURRENT_DATE - 11,
  'completed', 'RACK-H1',
  NOW() - INTERVAL '11 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days',
  3640, NOW() - INTERVAL '2 days', NOW() - INTERVAL '11 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd109');

-- d110 — COMPLETED large yield multi-lot (pea + broccoli mix, 12 days ago)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'd110',
  ARRAY['QR-PEA-DEMO','e422c4dd-be13-439a-9d14-41d051b1576d'],
  'Pea / Broccoli Mix', 12, 0, 190, p_pea, CURRENT_DATE - 22,
  'completed', 'RACK-A3',
  NOW() - INTERVAL '22 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '12 days',
  5920, NOW() - INTERVAL '12 days', NOW() - INTERVAL '22 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd110');

-- d111 — COMPLETED older harvest (edible flower, 3 weeks ago)
INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'd111', ARRAY['106fb7a1-31ab-4a86-a241-ad0fa7447f46'], 'Brush Strokes Viola',
  2, 1, 80, p_basil, CURRENT_DATE - 45,
  'completed',
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '22 days',
  720, NOW() - INTERVAL '22 days', NOW() - INTERVAL '45 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'd111');

-- ── 4. MANUAL CHECKS ──────────────────────────────────────────────────────────
-- Grab IDs of our cycles to attach checks to

SELECT id INTO c_germ2 FROM cycles WHERE short_id = 'd102' LIMIT 1;
SELECT id INTO c_germ3 FROM cycles WHERE short_id = 'd103' LIMIT 1;
SELECT id INTO c_fert1 FROM cycles WHERE short_id = 'd104' LIMIT 1;
SELECT id INTO c_fert2 FROM cycles WHERE short_id = 'd105' LIMIT 1;
SELECT id INTO c_harv1 FROM cycles WHERE short_id = 'd106' LIMIT 1;
SELECT id INTO c_comp1 FROM cycles WHERE short_id = 'd108' LIMIT 1;
SELECT id INTO c_comp2 FROM cycles WHERE short_id = 'd109' LIMIT 1;
SELECT id INTO c_comp3 FROM cycles WHERE short_id = 'd110' LIMIT 1;

-- Routine check — all good, no issues
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_germ2, 6, 0, false, null, 'Looking healthy, germination on track', ARRAY[]::text[], NOW() - INTERVAL '1 day'
WHERE c_germ2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_germ2 AND created_at::date = (NOW() - INTERVAL '1 day')::date);

-- Check on overdue germination — issue flagged
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_germ3, 5, 2, false, 'slow_germination', 'Seeds slow to sprout, humidity may be too low', ARRAY[]::text[], NOW() - INTERVAL '3 days'
WHERE c_germ3 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_germ3 AND created_at::date = (NOW() - INTERVAL '3 days')::date);

-- Fertigation routine check
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_fert1, 8, 0, false, null, 'Growth looking even across trays', ARRAY[]::text[], NOW() - INTERVAL '2 days'
WHERE c_fert1 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_fert1 AND created_at::date = (NOW() - INTERVAL '2 days')::date);

-- Fertigation check with bad trays
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_fert2, 3, 2, true, 'mold', 'Two trays showing mold on bottom layer, separated and disposed', ARRAY[]::text[], NOW() - INTERVAL '4 days'
WHERE c_fert2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_fert2 AND created_at::date = (NOW() - INTERVAL '4 days')::date);

-- Second check on overdue fertigation — still bad
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_fert2, 3, 1, true, 'mold', 'Remaining mold, reducing watering frequency', ARRAY[]::text[], NOW() - INTERVAL '2 days'
WHERE c_fert2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_fert2 AND created_at::date = (NOW() - INTERVAL '2 days')::date);

-- Harvest check — pre-harvest inspection
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_harv1, 10, 0, false, null, 'Ready for harvest, cotyledons fully open', ARRAY[]::text[], NOW() - INTERVAL '1 day'
WHERE c_harv1 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_harv1 AND created_at::date = (NOW() - INTERVAL '1 day')::date);

-- Completed cycle checks — mid-cycle and pre-harvest
INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_comp1, 4, 0, false, null, 'Day 10, growth nominal', ARRAY[]::text[], NOW() - INTERVAL '12 days'
WHERE c_comp1 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_comp1 AND created_at::date = (NOW() - INTERVAL '12 days')::date);

INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_comp2, 8, 2, false, null, 'Dense and even, on schedule', ARRAY[]::text[], NOW() - INTERVAL '8 days'
WHERE c_comp2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_comp2 AND created_at::date = (NOW() - INTERVAL '8 days')::date);

INSERT INTO manual_checks (cycle_id, full_trays, half_trays, is_bad_trays, issue, notes, photo_urls, created_at)
SELECT c_comp3, 12, 0, false, null, 'Exceptional crop, ready a day early', ARRAY[]::text[], NOW() - INTERVAL '15 days'
WHERE c_comp3 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM manual_checks WHERE cycle_id = c_comp3 AND created_at::date = (NOW() - INTERVAL '15 days')::date);

RAISE NOTICE 'Seed complete. Profile IDs: arugula=%, broccoli=%, sunflower=%, basil=%, pea=%, wheat=%',
  p_arugula, p_broccoli, p_sunflower, p_basil, p_pea, p_wheat;

END $$;

-- =============================================================================
-- Admin Dashboard seed data: alerts, inventory_items, shipments, sensor_status
-- =============================================================================

INSERT INTO alerts (title, description, location, severity, status, created_at)
SELECT 'High pH Level Detected', 'pH readings above threshold in Zone A hydroponic system', 'Zone A - Row 3', 'critical', 'current', NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM alerts WHERE title = 'High pH Level Detected');

INSERT INTO alerts (title, description, location, severity, status, created_at)
SELECT 'Low Nutrient Concentration', 'EC levels dropped below optimal range in fertigation system', 'Zone B - Fertigation Tank', 'warning', 'current', NOW() - INTERVAL '5 hours'
WHERE NOT EXISTS (SELECT 1 FROM alerts WHERE title = 'Low Nutrient Concentration');

INSERT INTO alerts (title, description, location, severity, status, created_at)
SELECT 'Temperature Spike', 'Temperature exceeded 28°C for more than 30 minutes', 'Zone C - Growing Area', 'warning', 'current', NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM alerts WHERE title = 'Temperature Spike');

INSERT INTO alerts (title, description, location, severity, status, created_at, resolved_at)
SELECT 'Pump Malfunction', 'Secondary circulation pump showing irregular flow readings', 'Zone A - Pump Station', 'critical', 'resolved', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM alerts WHERE title = 'Pump Malfunction');

INSERT INTO alerts (title, description, location, severity, status, created_at, resolved_at)
SELECT 'Humidity Out of Range', 'Relative humidity dropped to 42% — below 55% threshold', 'Zone D - Seedling Area', 'warning', 'dismissed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM alerts WHERE title = 'Humidity Out of Range');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'Nutrient Solution A', 'HydroMix Pro', 'Nutrients', 'QR-NUT-001', 45.5, 100, 'L', '2026-06-01'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-NUT-001');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'Nutrient Solution B', 'HydroMix Pro', 'Nutrients', 'QR-NUT-002', 30.0, 100, 'L', '2026-06-01'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-NUT-002');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'pH Down Solution', 'General Hydroponics', 'pH Control', 'QR-PH-001', 8.5, 20, 'L', '2026-05-15'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-PH-001');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'pH Up Solution', 'General Hydroponics', 'pH Control', 'QR-PH-002', 12.0, 20, 'L', '2026-05-15'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-PH-002');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'Basil Seeds - Genovese', 'HydroFarm Seeds', 'Seeds', 'QR-SEED-001', 500, 2000, 'g', '2026-06-10'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-SEED-001');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'Lettuce Seeds - Butterhead', 'HydroFarm Seeds', 'Seeds', 'QR-SEED-002', 750, 2000, 'g', '2026-06-10'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-SEED-002');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'Rockwool Cubes 4cm', 'Grodan', 'Growing Media', 'QR-GRW-001', 1200, 5000, 'units', '2026-05-20'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-GRW-001');

INSERT INTO inventory_items (name, brand, category, qr_code, current_qty, max_qty, unit, arrival_date)
SELECT 'Grow Trays 60x30cm', 'HydroTray Co.', 'Equipment', 'QR-TRY-001', 48, 120, 'units', '2026-04-15'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = 'QR-TRY-001');

INSERT INTO shipments (short_id, client, product_description, yield_sold_kg, revenue_usd, shipping_date, status)
SELECT 'SHP-A1B2C3', 'Green Leaf Restaurant Group', 'Mixed Microgreens - Premium Pack', 45.5, 2730.00, '2026-06-18', 'complete'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE short_id = 'SHP-A1B2C3');

INSERT INTO shipments (short_id, client, product_description, yield_sold_kg, revenue_usd, shipping_date, status)
SELECT 'SHP-D4E5F6', 'Metro Fresh Markets', 'Genovese Basil - Bulk Order', 32.0, 1920.00, '2026-06-20', 'in_progress'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE short_id = 'SHP-D4E5F6');

INSERT INTO shipments (short_id, client, product_description, yield_sold_kg, revenue_usd, shipping_date, status)
SELECT 'SHP-G7H8I9', 'Sunrise Hotel & Spa', 'Butterhead Lettuce + Arugula Mix', 28.5, 1995.00, '2026-06-25', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE short_id = 'SHP-G7H8I9');

INSERT INTO shipments (short_id, client, product_description, yield_sold_kg, revenue_usd, shipping_date, status)
SELECT 'SHP-J0K1L2', 'Urban Table Catering', 'Microgreens Assortment', 15.0, 1050.00, '2026-06-19', 'complete'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE short_id = 'SHP-J0K1L2');

INSERT INTO shipments (short_id, client, product_description, yield_sold_kg, revenue_usd, shipping_date, status)
SELECT 'SHP-M3N4O5', 'FreshCo Supermarkets', 'Hydroponic Lettuce Heads - 200 units', 40.0, 2400.00, '2026-06-22', 'in_progress'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE short_id = 'SHP-M3N4O5');

INSERT INTO shipments (short_id, client, product_description, yield_sold_kg, revenue_usd, shipping_date, status)
SELECT 'SHP-P6Q7R8', 'Harvest Moon Bistro', 'Specialty Herbs Bundle', 12.5, 1125.00, '2026-06-28', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE short_id = 'SHP-P6Q7R8');

INSERT INTO sensor_status (sensors_online, sensors_total, acidity_ph, water_level_pct, temp_celsius, humidity_pct)
SELECT 4, 4, 6.4, 78, 22.5, 65
WHERE NOT EXISTS (SELECT 1 FROM sensor_status);

