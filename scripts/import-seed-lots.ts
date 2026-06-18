/**
 * One-time import script: reads Produce List tab from the Farm COG Analysis
 * xlsx and upserts all rows into the seed_lots table.
 *
 * Usage (run from monorepo root):
 *   XLSX_PATH="/path/to/Farm COG Analysis.xlsx" pnpm tsx scripts/import-seed-lots.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@workspace/db";
import { seedLotsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Minimal xlsx parser — avoids adding a heavy dep; works for simple sheets
// ---------------------------------------------------------------------------

interface Row {
  product: string;
  supplier: string | null;
  productLink: string | null;
  itemNumber: string | null;
  vendorShort: string | null;
  gpcCode: string | null;
  type: string | null;
  success: string | null;
  growTime: string | null;
  uuid: string;
  usedIn: string | null;
  currentlyGrown: boolean | null;
}

async function parseXlsx(filePath: string): Promise<Row[]> {
  // Dynamically import xlsx (installed globally via npm/pnpm)
  let XLSX: typeof import("xlsx");
  try {
    XLSX = await import("xlsx");
  } catch {
    console.error(
      'xlsx package not found. Run: pnpm add -w xlsx\n' +
      'Then re-run this script.',
    );
    process.exit(1);
  }

  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets["Produce List"];
  if (!ws) throw new Error('Sheet "Produce List" not found in workbook');

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Row 0 = headers, rows 1+ = data
  // Columns (0-indexed):
  //  0  Product
  //  1  Supplier
  //  2  Product Link
  //  3  Item Number
  //  4  Amount Used       ← skip
  //  5  Vendor Short
  //  6  GPC Code
  //  7  Type
  //  8  Success
  //  9  Grow time
  // 10  UUIDs
  // 11  Used In
  // 12  Currently Grown
  // 13  AVG Yields        ← skip

  const rows: Row[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as (string | number | null)[];
    const product = r[0];
    const uuid = r[10];
    if (!product || !uuid) continue; // skip empty rows

    const currentlyGrownRaw = r[12];
    let currentlyGrown: boolean | null = null;
    if (typeof currentlyGrownRaw === "string") {
      currentlyGrown = currentlyGrownRaw.trim().toLowerCase() === "yes";
    }

    rows.push({
      product: String(product).trim(),
      supplier: r[1] != null ? String(r[1]).trim() : null,
      productLink: r[2] != null ? String(r[2]).trim() : null,
      itemNumber: r[3] != null ? String(r[3]).trim() : null,
      vendorShort: r[5] != null ? String(r[5]).trim() : null,
      gpcCode: r[6] != null ? String(r[6]).trim() : null,
      type: r[7] != null ? String(r[7]).trim() : null,
      success: r[8] != null ? String(r[8]).trim() : null,
      growTime: r[9] != null ? String(r[9]).trim() : null,
      uuid: String(uuid).trim(),
      usedIn: r[11] != null ? String(r[11]).trim() : null,
      currentlyGrown,
    });
  }
  return rows;
}

async function main() {
  const xlsxPath =
    process.env.XLSX_PATH ??
    path.join(
      process.env.HOME ?? "~",
      "Downloads/Farm App Documents/Farm COG Analysis.xlsx",
    );

  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    console.error("Set XLSX_PATH env var to the correct path.");
    process.exit(1);
  }

  console.log(`Reading: ${xlsxPath}`);
  const rows = await parseXlsx(xlsxPath);
  console.log(`Parsed ${rows.length} rows from Produce List`);

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await db
      .select({ id: seedLotsTable.id })
      .from(seedLotsTable)
      .where(sql`${seedLotsTable.qrCode} = ${row.uuid}`)
      .limit(1);

    const values = {
      qrCode: row.uuid,
      seedName: row.product,
      supplier: row.supplier,
      productLink: row.productLink,
      itemNumber: row.itemNumber,
      vendorShort: row.vendorShort,
      gpcCode: row.gpcCode,
      type: row.type,
      success: row.success,
      growTime: row.growTime,
      usedIn: row.usedIn,
      currentlyGrown: row.currentlyGrown,
    };

    if (existing.length > 0) {
      await db
        .update(seedLotsTable)
        .set(values)
        .where(sql`${seedLotsTable.qrCode} = ${row.uuid}`);
      updated++;
    } else {
      await db.insert(seedLotsTable).values(values);
      inserted++;
    }
  }

  console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
