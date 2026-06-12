import { Router } from "express";
import { db } from "@workspace/db";
import { growthProfilesTable, seedLotsTable } from "@workspace/db";

const router = Router();

export async function seedDataIfEmpty() {
  try {
    const existing = await db
      .select({ id: growthProfilesTable.id })
      .from(growthProfilesTable)
      .limit(1);
    if (existing.length > 0) return;

    await db.insert(growthProfilesTable).values([
      {
        name: "Arugula (Normal)",
        seedName: "Arugula",
        germinationDays: 7,
        fertigationDays: 14,
      },
      {
        name: "Allstar Gourmet Lettuce Mix",
        seedName: "Allstar Gourmet Lettuce Mix",
        germinationDays: 5,
        fertigationDays: 18,
      },
      {
        name: "Toscano Kale",
        seedName: "Toscano Kale",
        germinationDays: 5,
        fertigationDays: 21,
      },
      {
        name: "Zephyr Summer Squash (Normal)",
        seedName: "Zephyr Summer Squash",
        germinationDays: 4,
        fertigationDays: 10,
      },
      {
        name: "Microgreen Mix",
        seedName: "Microgreen Mix",
        germinationDays: 3,
        fertigationDays: 7,
      },
    ]);

    await db.insert(seedLotsTable).values([
      { qrCode: "LOT-3740", seedName: "Arugula" },
      { qrCode: "LOT-3741", seedName: "Allstar Gourmet Lettuce Mix" },
      { qrCode: "LOT-3742", seedName: "Toscano Kale" },
      { qrCode: "LOT-3743", seedName: "Zephyr Summer Squash" },
      { qrCode: "LOT-3744", seedName: "Microgreen Mix" },
    ]);

    console.log("Seed data inserted");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}

router.get("/growth-profiles", async (_req, res) => {
  try {
    const profiles = await db.select().from(growthProfilesTable);
    res.json(profiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch growth profiles" });
  }
});

export default router;
