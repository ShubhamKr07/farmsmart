// Phase 2b data backfills — idempotent, run once against the target DB.
//   1. Populate cycle_seed_lots junction from cycles.seed_lot_qr_codes (unnest + join).
//   2. Best-effort cycles.tray_id from tray_position matching a trays.label.
// Run: DATABASE_URL=... node scripts/backfill-p2.mjs
import pg from "pg";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("NEON_DATABASE_URL or DATABASE_URL must be set to run backfills");
}

const { Pool } = pg;
const pool = new Pool({ connectionString });

try {
  const r1 = await pool.query(`
    INSERT INTO cycle_seed_lots (cycle_id, seed_lot_id)
    SELECT c.id, sl.id
    FROM cycles c, unnest(c.seed_lot_qr_codes) AS qr
    JOIN seed_lots sl ON sl.qr_code = qr
    ON CONFLICT (cycle_id, seed_lot_id) DO NOTHING
    RETURNING 1
  `);
  console.log(`✓ cycle_seed_lots: inserted ${r1.rowCount} junction rows`);

  const orphans = await pool.query(`
    SELECT DISTINCT qr
    FROM cycles c, unnest(c.seed_lot_qr_codes) AS qr
    WHERE NOT EXISTS (SELECT 1 FROM seed_lots sl WHERE sl.qr_code = qr)
  `);
  console.log(
    `✓ orphan QR codes (no matching seed lot): ${orphans.rows.length}` +
      (orphans.rows.length ? ` -> ${orphans.rows.map((r) => r.qr).join(", ")}` : ""),
  );

  const r2 = await pool.query(`
    UPDATE cycles c SET tray_id = sub.tray_id
    FROM (
      SELECT c2.id AS cycle_id, t.id AS tray_id
      FROM cycles c2
      JOIN trays t ON t.label = c2.tray_position
      WHERE c2.tray_id IS NULL
    ) sub
    WHERE c.id = sub.cycle_id
    RETURNING c.id
  `);
  console.log(`✓ cycles.tray_id: matched ${r2.rowCount} cycles`);

  console.log("✓ backfills complete");
} catch (err) {
  console.error("✗ backfill failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
