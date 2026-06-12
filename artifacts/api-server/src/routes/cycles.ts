import { Router, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq, ne, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  cyclesTable,
  growthProfilesTable,
  manualChecksTable,
} from "@workspace/db";

const router = Router();

type UserRole = "technician" | "supervisor" | "quality_lead" | "facility_lead";

function enforceAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function extractRole(req: Request): UserRole {
  const { sessionClaims } = getAuth(req);
  const meta = sessionClaims?.publicMetadata as { role?: UserRole } | undefined;
  return meta?.role ?? "technician";
}

function isSupervisorOrLead(role: UserRole): boolean {
  return role === "supervisor" || role === "facility_lead";
}

function parseParamId(req: Request): number {
  const v = req.params["id"];
  return parseInt(Array.isArray(v) ? v[0] : v, 10);
}

function generateShortId(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
}

function calcDaysOverdue(startedAt: Date | null, days: number): number | null {
  if (!startedAt) return null;
  const dueMs = startedAt.getTime() + days * 864e5;
  const now = Date.now();
  if (now <= dueMs) return null;
  return Math.floor((now - dueMs) / 864e5);
}

type Profile = typeof growthProfilesTable.$inferSelect;
type Cycle = typeof cyclesTable.$inferSelect;

function formatCycle(cycle: Cycle, profile: Profile) {
  return {
    id: cycle.id,
    shortId: cycle.shortId,
    seedLotQrCodes: cycle.seedLotQrCodes ?? [],
    seedName: cycle.seedName,
    fullTrays: cycle.fullTrays,
    halfTrays: cycle.halfTrays,
    seedWeightTray: Number(cycle.seedWeightTray),
    growthProfileId: cycle.growthProfileId,
    growthProfileName: profile.name,
    germinationDays: profile.germinationDays,
    fertigationDays: profile.fertigationDays,
    seedingDate: cycle.seedingDate,
    status: cycle.status as "germination" | "fertigation" | "harvest" | "completed",
    trayPosition: cycle.trayPosition ?? null,
    germinationStartedAt: cycle.germinationStartedAt?.toISOString() ?? null,
    fertigationStartedAt: cycle.fertigationStartedAt?.toISOString() ?? null,
    harvestStartedAt: cycle.harvestStartedAt?.toISOString() ?? null,
    harvestedQty: cycle.harvestedQty ? Number(cycle.harvestedQty) : null,
    closedAt: cycle.closedAt?.toISOString() ?? null,
    createdBy: cycle.createdBy ?? null,
    createdAt: cycle.createdAt.toISOString(),
    daysOverdueFertigation:
      cycle.status === "germination"
        ? calcDaysOverdue(cycle.germinationStartedAt, profile.germinationDays)
        : null,
    daysOverdueHarvest:
      cycle.status === "fertigation"
        ? calcDaysOverdue(cycle.fertigationStartedAt, profile.fertigationDays)
        : null,
  };
}

function formatCheck(c: typeof manualChecksTable.$inferSelect) {
  return {
    id: c.id,
    cycleId: c.cycleId,
    fullTrays: c.fullTrays,
    halfTrays: c.halfTrays,
    isBadTrays: c.isBadTrays,
    issue: c.issue ?? null,
    notes: c.notes ?? null,
    photoUrls: c.photoUrls ?? [],
    createdBy: c.createdBy ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/cycles", enforceAuth, async (req, res) => {
  try {
    const role = extractRole(req);
    const status = (req.query.status as string) || "ongoing";

    if (status === "history" && !isSupervisorOrLead(role)) {
      return res
        .status(403)
        .json({ error: "History access is restricted to supervisors" });
    }

    const rows = await db
      .select({ cycle: cyclesTable, profile: growthProfilesTable })
      .from(cyclesTable)
      .leftJoin(
        growthProfilesTable,
        eq(cyclesTable.growthProfileId, growthProfilesTable.id),
      )
      .where(
        status === "history"
          ? eq(cyclesTable.status, "completed")
          : ne(cyclesTable.status, "completed"),
      )
      .orderBy(desc(cyclesTable.createdAt));

    return res.json(
      rows
        .filter((r) => r.profile !== null)
        .map((r) => formatCycle(r.cycle, r.profile!)),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch cycles" });
  }
});

router.post("/cycles", enforceAuth, async (req, res) => {
  try {
    const {
      seedLotQrCodes,
      seedName,
      fullTrays,
      halfTrays,
      seedWeightTray,
      growthProfileId,
      seedingDate,
      trayPosition,
    } = req.body;

    if (!seedName || !growthProfileId || !seedingDate) {
      return res
        .status(400)
        .json({ error: "seedName, growthProfileId, and seedingDate are required" });
    }

    const [profile] = await db
      .select()
      .from(growthProfilesTable)
      .where(eq(growthProfilesTable.id, growthProfileId))
      .limit(1);
    if (!profile) {
      return res.status(400).json({ error: "Growth profile not found" });
    }

    let shortId = generateShortId();
    let exists = await db
      .select({ id: cyclesTable.id })
      .from(cyclesTable)
      .where(eq(cyclesTable.shortId, shortId))
      .limit(1);
    while (exists.length > 0) {
      shortId = generateShortId();
      exists = await db
        .select({ id: cyclesTable.id })
        .from(cyclesTable)
        .where(eq(cyclesTable.shortId, shortId))
        .limit(1);
    }

    const auth = getAuth(req);
    const [cycle] = await db
      .insert(cyclesTable)
      .values({
        shortId,
        seedLotQrCodes: seedLotQrCodes ?? [],
        seedName,
        fullTrays: fullTrays ?? 0,
        halfTrays: halfTrays ?? 0,
        seedWeightTray: String(seedWeightTray),
        growthProfileId,
        seedingDate,
        status: "germination",
        trayPosition,
        germinationStartedAt: new Date(),
        createdBy: auth?.userId ?? null,
      })
      .returning();

    return res.status(201).json(formatCycle(cycle, profile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create cycle" });
  }
});

router.get("/cycles/:id", enforceAuth, async (req, res) => {
  try {
    const id = parseParamId(req);
    const role = extractRole(req);

    const rows = await db
      .select({ cycle: cyclesTable, profile: growthProfilesTable })
      .from(cyclesTable)
      .leftJoin(
        growthProfilesTable,
        eq(cyclesTable.growthProfileId, growthProfilesTable.id),
      )
      .where(eq(cyclesTable.id, id))
      .limit(1);

    if (!rows.length || !rows[0].profile) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    if (rows[0].cycle.status === "completed" && !isSupervisorOrLead(role)) {
      return res
        .status(403)
        .json({ error: "Access to completed cycle details is restricted to supervisors" });
    }

    const checks = await db
      .select()
      .from(manualChecksTable)
      .where(eq(manualChecksTable.cycleId, id))
      .orderBy(desc(manualChecksTable.createdAt));

    return res.json({
      ...formatCycle(rows[0].cycle, rows[0].profile!),
      manualChecks: checks.map(formatCheck),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch cycle" });
  }
});

router.post("/cycles/:id/fertigation", enforceAuth, async (req, res) => {
  try {
    const id = parseParamId(req);
    const { seedLotQrCode } = req.body;

    const [cycle] = await db
      .select()
      .from(cyclesTable)
      .where(eq(cyclesTable.id, id))
      .limit(1);
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });
    if (cycle.status !== "germination")
      return res.status(400).json({ error: "Cycle is not in germination status" });

    const qrCodes = cycle.seedLotQrCodes ?? [];
    if (seedLotQrCode && qrCodes.length > 0 && !qrCodes.includes(seedLotQrCode)) {
      return res
        .status(400)
        .json({ error: "QR code does not match any seed lot for this cycle" });
    }

    const [updated] = await db
      .update(cyclesTable)
      .set({ status: "fertigation", fertigationStartedAt: new Date() })
      .where(eq(cyclesTable.id, id))
      .returning();

    const [profile] = await db
      .select()
      .from(growthProfilesTable)
      .where(eq(growthProfilesTable.id, updated.growthProfileId))
      .limit(1);

    return res.json(formatCycle(updated, profile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to move cycle to fertigation" });
  }
});

router.post("/cycles/:id/harvest", enforceAuth, async (req, res) => {
  try {
    const id = parseParamId(req);
    const { fullTrays, halfTrays, harvestedQty, trayQrCode, isBadTrays, issue } = req.body;
    const auth = getAuth(req);

    const [cycle] = await db
      .select()
      .from(cyclesTable)
      .where(eq(cyclesTable.id, id))
      .limit(1);
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });
    if (cycle.status !== "fertigation")
      return res
        .status(400)
        .json({ error: "Cycle is not in fertigation status" });

    const [updated] = await db
      .update(cyclesTable)
      .set({
        status: "completed",
        fullTrays: fullTrays ?? cycle.fullTrays,
        halfTrays: halfTrays ?? cycle.halfTrays,
        harvestedQty: String(harvestedQty),
        harvestStartedAt: new Date(),
        closedAt: new Date(),
        trayPosition: trayQrCode || cycle.trayPosition,
      })
      .where(eq(cyclesTable.id, id))
      .returning();

    if (isBadTrays) {
      await db.insert(manualChecksTable).values({
        cycleId: id,
        fullTrays: fullTrays ?? cycle.fullTrays,
        halfTrays: halfTrays ?? cycle.halfTrays,
        isBadTrays: true,
        issue: issue ?? null,
        notes: "Flagged at harvest",
        photoUrls: [],
        createdBy: auth?.userId ?? null,
      });
    }

    const [profile] = await db
      .select()
      .from(growthProfilesTable)
      .where(eq(growthProfilesTable.id, updated.growthProfileId))
      .limit(1);

    return res.json(formatCycle(updated, profile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to complete harvest" });
  }
});

router.get("/cycles/:id/manual-checks", enforceAuth, async (req, res) => {
  try {
    const id = parseParamId(req);
    const role = extractRole(req);

    const [cycle] = await db
      .select({ status: cyclesTable.status })
      .from(cyclesTable)
      .where(eq(cyclesTable.id, id))
      .limit(1);

    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    if (cycle.status === "completed" && !isSupervisorOrLead(role)) {
      return res
        .status(403)
        .json({ error: "Access to completed cycle audit log is restricted to supervisors" });
    }

    const checks = await db
      .select()
      .from(manualChecksTable)
      .where(eq(manualChecksTable.cycleId, id))
      .orderBy(desc(manualChecksTable.createdAt));
    return res.json(checks.map(formatCheck));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch manual checks" });
  }
});

router.post("/cycles/:id/manual-checks", enforceAuth, async (req, res) => {
  try {
    const id = parseParamId(req);
    const { fullTrays, halfTrays, isBadTrays, issue, notes, photoUrls } =
      req.body;
    const auth = getAuth(req);

    const [check] = await db
      .insert(manualChecksTable)
      .values({
        cycleId: id,
        fullTrays: fullTrays ?? 0,
        halfTrays: halfTrays ?? 0,
        isBadTrays: isBadTrays ?? false,
        issue: issue ?? null,
        notes: notes ?? null,
        photoUrls: photoUrls ?? [],
        createdBy: auth?.userId ?? null,
      })
      .returning();

    return res.status(201).json(formatCheck(check));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create manual check" });
  }
});

export default router;
