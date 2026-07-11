-- =============================================================================
-- Additive-only: gives "Total Yield (Week)" / "Yield by Week" a non-zero,
-- upward-trending 4-week history for carousel screenshots. Does not touch
-- any existing row. Safe to re-run (guarded by short_id).
-- Run: psql $DATABASE_URL -f scripts/seed-carousel-yield.sql
-- =============================================================================

INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'cw01', ARRAY['QR-SUNFL-001'], 'Sunflower', 6, 0, 150, 1,
  CURRENT_DATE - 26, 'completed', 'RACK-A2',
  NOW() - INTERVAL '26 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days',
  1250, NOW() - INTERVAL '19 days', NOW() - INTERVAL '26 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'cw01');

INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'cw02', ARRAY['QR-BROCL-001'], 'Broccoli', 8, 0, 130, 1,
  CURRENT_DATE - 19, 'completed', 'RACK-B4',
  NOW() - INTERVAL '19 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days',
  1840, NOW() - INTERVAL '12 days', NOW() - INTERVAL '19 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'cw02');

INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'cw03', ARRAY['QR-MICRO-001'], 'Microgreen Mix', 10, 0, 140, 5,
  CURRENT_DATE - 12, 'completed', 'RACK-C1',
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days',
  2410, NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'cw03');

INSERT INTO cycles (short_id, seed_lot_qr_codes, seed_name, full_trays, half_trays,
  seed_weight_tray, growth_profile_id, seeding_date, status, tray_position,
  germination_started_at, fertigation_started_at, harvest_started_at,
  harvested_qty, closed_at, created_at)
SELECT 'cw04', ARRAY['QR-PEAST-001'], 'Pea Shoots', 9, 2, 145, 1,
  CURRENT_DATE - 6, 'completed', 'RACK-D2',
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day',
  3120, NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 days'
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE short_id = 'cw04');
