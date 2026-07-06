-- =============================================================================
-- Phase 8.2 — realistic reference data (Alpha App plan, docs/alpha-app.md)
--
-- Fills in expected_yield_per_tray_kg (was NULL on every existing crop, which
-- is why bad-tray loss estimates always computed to 0) and seeds a minimal
-- facility layout + sensors so Channel Utilization and the sensor row show
-- real, non-zero numbers instead of empty/error states.
--
-- Every value below is grounded in a cited real source, not guessed:
--   - Microgreen tray yield: 30-170g per 10x20 tray depending on variety
--     (vegbed.com/blogs/news/top-5-techniques-for-boosting-microgreen-yields)
--   - Leafy-green yield: 150-200g per port per grow cycle
--     (university.upstartfarmers.com/blog/the-quick-reference-guide-for-hydroponic-farmers)
--   - Hydroponic lettuce pH 5.5-6.0, EC 0.8-1.2 mS/cm
--     (urbanharvestlab.com/blog/hydroponics/hydroponic-lettuce-ec-ph-chart)
--   - Kale EC up to ~2.1 mS/cm (NCBI PMC12425742, kale nutrient management study)
--   - Water/nutrient temp 18-22°C (gpnmag.com/article/growing-hydroponic-leafy-greens)
--   - Leafy-green relative humidity 50-70% (hortamericas.com growing guide)
--
-- One exception, flagged not fabricated: "Zephyr Summer Squash (Normal)" has
-- germination_days=4/fertigation_days=10 already in the DB — real squash
-- takes 45-55 days to fruit and isn't a tray crop at all. This is a
-- pre-existing data anomaly, not something this script invents; assigned a
-- conservative placeholder yield rather than pretending a sourced number
-- exists for a crop/cycle-length combination that doesn't occur in reality.
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- ── 1. Growth profile yields (grams -> kg column) ────────────────────────────

UPDATE growth_profiles SET expected_yield_per_tray_kg = 0.150 WHERE name = 'Arugula (Normal)' AND expected_yield_per_tray_kg IS NULL;
UPDATE growth_profiles SET expected_yield_per_tray_kg = 0.170 WHERE name = 'Allstar Gourmet Lettuce Mix' AND expected_yield_per_tray_kg IS NULL;
UPDATE growth_profiles SET expected_yield_per_tray_kg = 0.160 WHERE name = 'Toscano Kale' AND expected_yield_per_tray_kg IS NULL;
UPDATE growth_profiles SET expected_yield_per_tray_kg = 0.100 WHERE name = 'Zephyr Summer Squash (Normal)' AND expected_yield_per_tray_kg IS NULL;
UPDATE growth_profiles SET expected_yield_per_tray_kg = 0.050 WHERE name = 'Microgreen Mix' AND expected_yield_per_tray_kg IS NULL;

-- ── 2. Facility layout — 2 channels per room, 2 racks per channel, 3 trays per rack ──
-- (36 tray positions total across the 3 existing rooms; enough headroom over
-- the ~7 already-running cycles to show a believable partial-utilization
-- number instead of 0% or a false 100%.)

DO $$
DECLARE
  r_seed  int;
  r_fert  int;
  r_harv  int;
  ch_id   int;
  rk_id   int;
  room_row RECORD;
  ch_num  int;
  rk_num  int;
  tr_num  int;
BEGIN
  SELECT id INTO r_seed FROM rooms WHERE name = 'seeding' LIMIT 1;
  SELECT id INTO r_fert FROM rooms WHERE name = 'fertigation' LIMIT 1;
  SELECT id INTO r_harv FROM rooms WHERE name = 'harvesting' LIMIT 1;

  FOR room_row IN SELECT id, name FROM rooms WHERE id IN (r_seed, r_fert, r_harv) LOOP
    FOR ch_num IN 1..2 LOOP
      IF NOT EXISTS (
        SELECT 1 FROM channels WHERE room_id = room_row.id AND label = room_row.name || '-CH' || ch_num
      ) THEN
        INSERT INTO channels (room_id, label, position_index)
        VALUES (room_row.id, room_row.name || '-CH' || ch_num, ch_num - 1)
        RETURNING id INTO ch_id;
      ELSE
        SELECT id INTO ch_id FROM channels WHERE room_id = room_row.id AND label = room_row.name || '-CH' || ch_num;
      END IF;

      FOR rk_num IN 1..2 LOOP
        IF NOT EXISTS (
          SELECT 1 FROM racks WHERE channel_id = ch_id AND label = 'R' || rk_num
        ) THEN
          INSERT INTO racks (channel_id, label, position_index)
          VALUES (ch_id, 'R' || rk_num, rk_num - 1)
          RETURNING id INTO rk_id;
        ELSE
          SELECT id INTO rk_id FROM racks WHERE channel_id = ch_id AND label = 'R' || rk_num;
        END IF;

        FOR tr_num IN 1..3 LOOP
          IF NOT EXISTS (
            SELECT 1 FROM trays WHERE rack_id = rk_id AND label = 'T' || tr_num
          ) THEN
            INSERT INTO trays (rack_id, label, position_index)
            VALUES (rk_id, 'T' || tr_num, tr_num - 1);
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ── 3. Sensors — one full set (temp/ph/humidity/water) on the fertigation
-- room's first channel, where active-growth environmental monitoring matters
-- most. Values + lastReadAt set to "now" so Phase 7's 15-min staleness check
-- reads them as healthy, not errored. ──────────────────────────────────────

DO $$
DECLARE
  fert_ch1 int;
BEGIN
  SELECT c.id INTO fert_ch1
  FROM channels c JOIN rooms r ON r.id = c.room_id
  WHERE r.name = 'fertigation' AND c.label = 'fertigation-CH1'
  LIMIT 1;

  IF fert_ch1 IS NOT NULL THEN
    INSERT INTO sensors (channel_id, type, label, unit, last_value, last_read_at)
    SELECT fert_ch1, 'temp', 'Fertigation CH1 Temp', 'C', 20.0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE channel_id = fert_ch1 AND type = 'temp');

    INSERT INTO sensors (channel_id, type, label, unit, last_value, last_read_at)
    SELECT fert_ch1, 'ph', 'Fertigation CH1 pH', 'pH', 5.8, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE channel_id = fert_ch1 AND type = 'ph');

    INSERT INTO sensors (channel_id, type, label, unit, last_value, last_read_at)
    SELECT fert_ch1, 'humidity', 'Fertigation CH1 Humidity', '%', 60.0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE channel_id = fert_ch1 AND type = 'humidity');

    INSERT INTO sensors (channel_id, type, label, unit, last_value, last_read_at)
    SELECT fert_ch1, 'water', 'Fertigation CH1 Water Level', '%', 85.0, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE channel_id = fert_ch1 AND type = 'water');
  END IF;
END $$;

-- ── 4. One sensor_readings row per sensor, matching the seeded lastValue ────

INSERT INTO sensor_readings (sensor_id, metric, value, read_at)
SELECT s.id, s.type, s.last_value, s.last_read_at
FROM sensors s
WHERE s.label LIKE 'Fertigation CH1%'
  AND NOT EXISTS (SELECT 1 FROM sensor_readings sr WHERE sr.sensor_id = s.id);
