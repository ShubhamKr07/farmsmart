import { Router, type Request, type Response } from "express";
import { eq, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import { cyclesTable, growthProfilesTable, manualChecksTable } from "@workspace/db";

const TOTAL_CHANNELS = 20;
const router = Router();

type UserRole = "technician" | "supervisor" | "quality_lead" | "facility_lead";

router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const runningRows = await db
      .select({ cycle: cyclesTable, profile: growthProfilesTable })
      .from(cyclesTable)
      .leftJoin(
        growthProfilesTable,
        eq(cyclesTable.growthProfileId, growthProfilesTable.id),
      )
      .where(ne(cyclesTable.status, "completed"));

    const actionRequired: {
      cycleId: number;
      cycleShortId: string;
      seedName: string;
      type: "fertigation" | "harvest";
      daysOverdue: number;
    }[] = [];

    for (const { cycle, profile } of runningRows) {
      if (!profile) continue;
      const now = Date.now();

      if (cycle.status === "germination" && cycle.germinationStartedAt) {
        const dueMs =
          cycle.germinationStartedAt.getTime() +
          profile.germinationDays * 864e5;
        if (now > dueMs) {
          actionRequired.push({
            cycleId: cycle.id,
            cycleShortId: cycle.shortId,
            seedName: cycle.seedName,
            type: "fertigation",
            daysOverdue: Math.floor((now - dueMs) / 864e5),
          });
        }
      } else if (cycle.status === "fertigation" && cycle.fertigationStartedAt) {
        const dueMs =
          cycle.fertigationStartedAt.getTime() +
          profile.fertigationDays * 864e5;
        if (now > dueMs) {
          actionRequired.push({
            cycleId: cycle.id,
            cycleShortId: cycle.shortId,
            seedName: cycle.seedName,
            type: "harvest",
            daysOverdue: Math.floor((now - dueMs) / 864e5),
          });
        }
      }
    }

    const completedRows = await db
      .select({
        harvestedQty: cyclesTable.harvestedQty,
        closedAt: cyclesTable.closedAt,
      })
      .from(cyclesTable)
      .where(eq(cyclesTable.status, "completed"));

    const allCycles = await db
      .select({
        fullTrays: cyclesTable.fullTrays,
        halfTrays: cyclesTable.halfTrays,
        seedWeightTray: cyclesTable.seedWeightTray,
        createdAt: cyclesTable.createdAt,
      })
      .from(cyclesTable);

    const badTrayChecks = await db
      .select({
        fullTrays: manualChecksTable.fullTrays,
        halfTrays: manualChecksTable.halfTrays,
        seedWeightTray: cyclesTable.seedWeightTray,
        createdAt: manualChecksTable.createdAt,
      })
      .from(manualChecksTable)
      .innerJoin(cyclesTable, eq(manualChecksTable.cycleId, cyclesTable.id))
      .where(eq(manualChecksTable.isBadTrays, true));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalYieldThisWeek = 0;
    let totalYieldThisMonth = 0;
    for (const c of completedRows) {
      if (!c.harvestedQty || !c.closedAt) continue;
      const qty = Number(c.harvestedQty);
      if (c.closedAt >= weekStart) totalYieldThisWeek += qty;
      if (c.closedAt >= monthStart) totalYieldThisMonth += qty;
    }

    function seedingWeight(fullTrays: number, halfTrays: number, seedWeightTray: string | null): number {
      return Number(seedWeightTray ?? 0) * (fullTrays + halfTrays * 0.5);
    }

    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const yieldByDay: { label: string; value: number }[] = [];
    const seedingByDay: { label: string; value: number }[] = [];
    const badTrayByDay: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const yieldTotal = completedRows
        .filter((c) => c.closedAt && c.closedAt >= d && c.closedAt < next)
        .reduce((sum, c) => sum + Number(c.harvestedQty ?? 0), 0);
      const seedingTotal = allCycles
        .filter((c) => c.createdAt >= d && c.createdAt < next)
        .reduce((sum, c) => sum + seedingWeight(c.fullTrays, c.halfTrays, c.seedWeightTray), 0);
      const badTrayTotal = badTrayChecks
        .filter((c) => c.createdAt >= d && c.createdAt < next)
        .reduce((sum, c) => sum + seedingWeight(c.fullTrays, c.halfTrays, c.seedWeightTray), 0);
      const label = DAY_LABELS[d.getDay()];
      yieldByDay.push({ label, value: yieldTotal });
      seedingByDay.push({ label, value: seedingTotal });
      badTrayByDay.push({ label, value: badTrayTotal });
    }

    const yieldByWeek: { label: string; value: number }[] = [];
    const seedingByWeek: { label: string; value: number }[] = [];
    const badTrayByWeek: { label: string; value: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const wStart = new Date();
      wStart.setDate(wStart.getDate() - (i + 1) * 7);
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      const yieldTotal = completedRows
        .filter((c) => c.closedAt && c.closedAt >= wStart && c.closedAt < wEnd)
        .reduce((sum, c) => sum + Number(c.harvestedQty ?? 0), 0);
      const seedingTotal = allCycles
        .filter((c) => c.createdAt >= wStart && c.createdAt < wEnd)
        .reduce((sum, c) => sum + seedingWeight(c.fullTrays, c.halfTrays, c.seedWeightTray), 0);
      const badTrayTotal = badTrayChecks
        .filter((c) => c.createdAt >= wStart && c.createdAt < wEnd)
        .reduce((sum, c) => sum + seedingWeight(c.fullTrays, c.halfTrays, c.seedWeightTray), 0);
      const label = `W${4 - i}`;
      yieldByWeek.push({ label, value: yieldTotal });
      seedingByWeek.push({ label, value: seedingTotal });
      badTrayByWeek.push({ label, value: badTrayTotal });
    }

    return res.json({
      channelUtilization: runningRows.length / TOTAL_CHANNELS,
      totalRunningCycles: runningRows.length,
      totalChannels: TOTAL_CHANNELS,
      totalYieldThisWeek,
      totalYieldThisMonth,
      yieldByDay,
      yieldByWeek,
      seedingByDay,
      seedingByWeek,
      badTrayByDay,
      badTrayByWeek,
      actionRequired: actionRequired.sort((a, b) => b.daysOverdue - a.daysOverdue),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

export default router;
