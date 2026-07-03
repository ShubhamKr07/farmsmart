import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sensorsTable } from "@workspace/db";

const router = Router();

function formatSensor(s: typeof sensorsTable.$inferSelect) {
  return {
    id: s.id,
    channelId: s.channelId ?? null,
    rackId: s.rackId ?? null,
    type: s.type,
    label: s.label,
    unit: s.unit ?? null,
    lastValue: s.lastValue === null ? null : Number(s.lastValue),
    lastReadAt: s.lastReadAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/sensors", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(sensorsTable);
    return res.json(rows.map(formatSensor));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch sensors" });
  }
});

router.post("/sensors", async (req: Request, res: Response) => {
  try {
    const { channelId, rackId, type, label, unit } = req.body;
    if (!type || !label) {
      return res.status(400).json({ error: "type and label are required" });
    }
    if (!channelId && !rackId) {
      return res.status(400).json({ error: "channelId or rackId is required" });
    }
    const [s] = await db
      .insert(sensorsTable)
      .values({
        channelId: channelId ?? null,
        rackId: rackId ?? null,
        type,
        label,
        unit: unit ?? null,
      })
      .returning();
    return res.status(201).json(formatSensor(s));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create sensor" });
  }
});

export default router;
