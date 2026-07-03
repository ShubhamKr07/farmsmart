import { Router, type Request, type Response } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { sensorReadingsTable, sensorsTable } from "@workspace/db";

const router = Router();

function formatReading(r: typeof sensorReadingsTable.$inferSelect) {
  return {
    id: r.id,
    sensorId: r.sensorId,
    metric: r.metric,
    value: Number(r.value),
    readAt: r.readAt.toISOString(),
  };
}

router.get("/sensor-readings", async (req: Request, res: Response) => {
  try {
    const sensorId = req.query["sensorId"]
      ? parseInt(req.query["sensorId"] as string, 10)
      : undefined;
    const from = req.query["from"] ? new Date(req.query["from"] as string) : undefined;
    const to = req.query["to"] ? new Date(req.query["to"] as string) : undefined;

    const conds = [];
    if (sensorId) conds.push(eq(sensorReadingsTable.sensorId, sensorId));
    if (from) conds.push(gte(sensorReadingsTable.readAt, from));
    if (to) conds.push(lte(sensorReadingsTable.readAt, to));
    const where = conds.length ? and(...conds) : undefined;

    const rows = await db
      .select()
      .from(sensorReadingsTable)
      .where(where)
      .orderBy(desc(sensorReadingsTable.readAt))
      .limit(1000);

    return res.json(rows.map(formatReading));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch sensor readings" });
  }
});

router.post("/sensor-readings", async (req: Request, res: Response) => {
  try {
    const { sensorId, metric, value } = req.body;
    if (!sensorId || !metric || value === undefined) {
      return res.status(400).json({ error: "sensorId, metric, and value are required" });
    }

    const [reading] = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(sensorReadingsTable)
        .values({ sensorId, metric, value: String(value) })
        .returning();
      await tx
        .update(sensorsTable)
        .set({ lastValue: String(value), lastReadAt: new Date() })
        .where(eq(sensorsTable.id, sensorId));
      return [r];
    });

    return res.status(201).json(formatReading(reading));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to record sensor reading" });
  }
});

export default router;
