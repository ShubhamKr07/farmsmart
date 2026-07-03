import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { cropsTable } from "@workspace/db";

const router = Router();

function formatCrop(c: typeof cropsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    scientificName: c.scientificName ?? null,
    category: c.category ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/crops", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(cropsTable).orderBy(cropsTable.name);
    return res.json(rows.map(formatCrop));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch crops" });
  }
});

router.post("/crops", async (req: Request, res: Response) => {
  try {
    const { name, scientificName, category } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [c] = await db
      .insert(cropsTable)
      .values({
        name,
        scientificName: scientificName ?? null,
        category: category ?? null,
      })
      .returning();
    return res.status(201).json(formatCrop(c));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create crop" });
  }
});

export default router;
