import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { seedLotsTable } from "@workspace/db";

const router = Router();

const seedLotLookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

router.get("/seed-lots/lookup", seedLotLookupLimiter, async (req, res) => {
  try {
    const qrCode = req.query.qrCode as string;
    if (!qrCode) {
      return res.status(400).json({ error: "qrCode query parameter is required" });
    }

    const [lot] = await db
      .select()
      .from(seedLotsTable)
      .where(eq(seedLotsTable.qrCode, qrCode))
      .limit(1);

    if (!lot) {
      return res.status(404).json({ error: "Seed lot not found" });
    }

    return res.json(lot);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to lookup seed lot" });
  }
});

export default router;
