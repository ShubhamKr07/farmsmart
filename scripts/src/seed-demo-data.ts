/**
 * Seed demo data for FarmEasy development/demo environment.
 *
 * Inserts 10 cycles spread across lifecycle stages:
 *  - 3 seeding  (germination, fresh — started 1–3 days ago, well within profile window)
 *  - 2 germination (one fresh, one overdue)
 *  - 2 fertigation (one fresh, one overdue)
 *  - 3 completed (with realistic harvestedQty)
 *
 * Uses stable short-IDs ("d001"–"d010") so reruns are idempotent.
 *
 * Run:  pnpm --filter @workspace/scripts run seed-demo
 */

import { db, cyclesTable, growthProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

async function getProfile(id: number) {
  const [p] = await db
    .select()
    .from(growthProfilesTable)
    .where(eq(growthProfilesTable.id, id))
    .limit(1);
  if (!p) throw new Error(`Growth profile ${id} not found`);
  return p;
}

async function main() {
  // Verify profiles exist
  const allProfiles = await db.select().from(growthProfilesTable);
  if (allProfiles.length < 2) {
    console.error("Need at least 2 growth profiles. Start the API server first.");
    process.exit(1);
  }

  // Use specific profiles for predictable overdue behaviour:
  //   Profile 1 (Arugula Normal):  germinationDays=7, fertigationDays=14
  //   Profile 5 (Microgreen Mix):  germinationDays=3, fertigationDays=7
  // If profiles don't exist, fall back to whatever is available.
  const p1 = allProfiles.find((p) => p.id === 1) ?? allProfiles[0]!;
  const p5 = allProfiles.find((p) => p.id === 5) ?? allProfiles[allProfiles.length - 1]!;

  // Overdue germination: started germinationDays + 4 days ago → 4 days overdue
  const overdueGermDaysAgo = p5.germinationDays + 4;
  // Overdue fertigation:  fertigationStartedAt = fertigationDays + 5 days ago → 5 days overdue
  const overdueFertDaysAgo = p5.fertigationDays + 5;

  type CycleInsert = typeof cyclesTable.$inferInsert;

  const cycles: CycleInsert[] = [
    // ── 3 SEEDING (fresh germination) ────────────────────────────────────────
    {
      shortId: "d001",
      seedLotQrCodes: ["LOT-SEED-001"],
      seedName: "Sunflower",
      fullTrays: 4,
      halfTrays: 1,
      seedWeightTray: "150",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(1)),
      status: "germination",
      trayPosition: "RACK-A1",
      germinationStartedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      shortId: "d002",
      seedLotQrCodes: ["LOT-SEED-002"],
      seedName: "Broccoli",
      fullTrays: 6,
      halfTrays: 0,
      seedWeightTray: "120",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(2)),
      status: "germination",
      trayPosition: "RACK-B3",
      germinationStartedAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
    {
      shortId: "d003",
      seedLotQrCodes: ["LOT-SEED-003"],
      seedName: "Radish",
      fullTrays: 3,
      halfTrays: 2,
      seedWeightTray: "90",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(3)),
      status: "germination",
      trayPosition: "RACK-C2",
      germinationStartedAt: daysAgo(3),
      createdAt: daysAgo(3),
    },

    // ── 2 GERMINATION (one overdue) ───────────────────────────────────────────
    {
      shortId: "d004",
      seedLotQrCodes: ["LOT-GERM-001"],
      seedName: "Pea Shoots",
      fullTrays: 8,
      halfTrays: 0,
      seedWeightTray: "200",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(5)),
      status: "germination",
      trayPosition: "RACK-D4",
      germinationStartedAt: daysAgo(5), // 5 days < p1.germinationDays (7) → not overdue
      createdAt: daysAgo(5),
    },
    {
      shortId: "d005",
      seedLotQrCodes: ["LOT-GERM-002"],
      seedName: "Microgreen Mix",
      fullTrays: 5,
      halfTrays: 1,
      seedWeightTray: "110",
      growthProfileId: p5.id,
      seedingDate: isoDate(daysAgo(overdueGermDaysAgo)),
      status: "germination",
      trayPosition: "RACK-E1",
      germinationStartedAt: daysAgo(overdueGermDaysAgo), // past p5.germinationDays → overdue
      createdAt: daysAgo(overdueGermDaysAgo),
    },

    // ── 2 FERTIGATION (one overdue) ───────────────────────────────────────────
    {
      shortId: "d006",
      seedLotQrCodes: ["LOT-FERT-001"],
      seedName: "Wheatgrass",
      fullTrays: 10,
      halfTrays: 2,
      seedWeightTray: "180",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(12)),
      status: "fertigation",
      trayPosition: "RACK-F2",
      germinationStartedAt: daysAgo(12),
      fertigationStartedAt: daysAgo(5), // 5 days < p1.fertigationDays (14) → not overdue
      createdAt: daysAgo(12),
    },
    {
      shortId: "d007",
      seedLotQrCodes: ["LOT-FERT-002"],
      seedName: "Microgreen Mix",
      fullTrays: 4,
      halfTrays: 0,
      seedWeightTray: "95",
      growthProfileId: p5.id,
      seedingDate: isoDate(daysAgo(overdueFertDaysAgo + 5)),
      status: "fertigation",
      trayPosition: "RACK-G3",
      germinationStartedAt: daysAgo(overdueFertDaysAgo + 5),
      fertigationStartedAt: daysAgo(overdueFertDaysAgo), // past p5.fertigationDays → overdue
      createdAt: daysAgo(overdueFertDaysAgo + 5),
    },

    // ── 3 COMPLETED ───────────────────────────────────────────────────────────
    {
      shortId: "d008",
      seedLotQrCodes: ["LOT-COMP-001"],
      seedName: "Lentil",
      fullTrays: 6,
      halfTrays: 2,
      seedWeightTray: "140",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(17)),
      status: "completed",
      trayPosition: "RACK-H1",
      germinationStartedAt: daysAgo(17),
      fertigationStartedAt: daysAgo(13),
      harvestStartedAt: daysAgo(5), // within last 7 days → visible in weekly yield chart
      harvestedQty: "3200",
      closedAt: daysAgo(5),
      createdAt: daysAgo(17),
    },
    {
      shortId: "d009",
      seedLotQrCodes: ["LOT-COMP-002"],
      seedName: "Sunflower",
      fullTrays: 8,
      halfTrays: 0,
      seedWeightTray: "160",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(28)),
      status: "completed",
      trayPosition: "RACK-A4",
      germinationStartedAt: daysAgo(28),
      fertigationStartedAt: daysAgo(24),
      harvestStartedAt: daysAgo(16),
      harvestedQty: "4800",
      closedAt: daysAgo(16),
      createdAt: daysAgo(28),
    },
    {
      shortId: "d010",
      seedLotQrCodes: ["LOT-COMP-003"],
      seedName: "Broccoli",
      fullTrays: 5,
      halfTrays: 1,
      seedWeightTray: "125",
      growthProfileId: p1.id,
      seedingDate: isoDate(daysAgo(30)),
      status: "completed",
      trayPosition: "RACK-B2",
      germinationStartedAt: daysAgo(30),
      fertigationStartedAt: daysAgo(26),
      harvestStartedAt: daysAgo(20),
      harvestedQty: "2750",
      closedAt: daysAgo(20),
      createdAt: daysAgo(30),
    },
  ];

  console.log(`Seeding ${cycles.length} demo cycles…`);

  for (const cycle of cycles) {
    const existing = await db
      .select({ id: cyclesTable.id })
      .from(cyclesTable)
      .where(eq(cyclesTable.shortId, cycle.shortId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  skip (already exists): ${cycle.shortId} — ${cycle.seedName}`);
      continue;
    }

    await db.insert(cyclesTable).values(cycle);
    console.log(`  inserted [${cycle.status}] ${cycle.seedName} (${cycle.shortId})`);
  }

  console.log(`\nProfile refs:`);
  console.log(
    `  p1 = ${p1.name} (germ=${p1.germinationDays}d, fert=${p1.fertigationDays}d)`
  );
  console.log(
    `  p5 = ${p5.name} (germ=${p5.germinationDays}d, fert=${p5.fertigationDays}d)`
  );
  console.log(`  d005 overdue by ~4d in germination`);
  console.log(`  d007 overdue by ~5d in fertigation`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
