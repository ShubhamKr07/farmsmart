import { Router, type Request, type Response } from "express";
import { eq, and, gt, desc, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { shipmentsTable } from "@workspace/db";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const router = Router();

function generateShortId(): string {
  return "SHP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function formatShipment(s: typeof shipmentsTable.$inferSelect) {
  return {
    id: s.id,
    shortId: s.shortId,
    client: s.client,
    productDescription: s.productDescription ?? null,
    yieldSoldKg: s.yieldSoldKg ? Number(s.yieldSoldKg) : null,
    revenueUsd: s.revenueUsd ? Number(s.revenueUsd) : null,
    shippingDate: s.shippingDate ?? null,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/shipments", async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const clientFilter = req.query.client as string | undefined;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;
    const limit = Math.min(
      MAX_LIMIT,
      req.query.limit ? parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
    );

    // Keyset pagination on id (createdAt-ordered = insertion order here, id
    // is a monotonic proxy). No `cursor` param = first page, same shape as
    // before pagination existed — callers that don't opt in see no change.
    const conditions = cursor !== undefined ? [gt(shipmentsTable.id, cursor)] : [];

    let rows = await db
      .select()
      .from(shipmentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(shipmentsTable.id))
      .limit(limit + 1);

    if (statusFilter && ["in_progress", "complete", "pending"].includes(statusFilter)) {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (clientFilter) {
      rows = rows.filter((r) => r.client.toLowerCase().includes(clientFilter.toLowerCase()));
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;

    // Unpaginated callers (no cursor/limit query params) keep the original
    // flat-array response shape; opt-in pagination wraps with {items,nextCursor}.
    if (req.query.cursor === undefined && req.query.limit === undefined) {
      return res.json(page.map(formatShipment));
    }
    return res.json({ items: page.map(formatShipment), nextCursor });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch shipments" });
  }
});

router.post("/shipments", async (req: Request, res: Response) => {
  try {
    const { client, productDescription, yieldSoldKg, revenueUsd, shippingDate, status } = req.body;
    if (!client) return res.status(400).json({ error: "client is required" });

    let shortId = generateShortId();
    let shipment: typeof shipmentsTable.$inferSelect | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      [shipment] = await db
        .insert(shipmentsTable)
        .values({
          shortId,
          client,
          productDescription: productDescription ?? null,
          yieldSoldKg: yieldSoldKg ? String(yieldSoldKg) : null,
          revenueUsd: revenueUsd ? String(revenueUsd) : null,
          shippingDate: shippingDate ?? null,
          status: status ?? "pending",
        })
        .onConflictDoNothing({ target: [shipmentsTable.shortId] })
        .returning();
      if (shipment) break;
      shortId = generateShortId();
    }

    if (!shipment) {
      return res.status(500).json({ error: "Failed to generate a unique shipment short ID" });
    }

    return res.status(201).json(formatShipment(shipment));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create shipment" });
  }
});

router.patch("/shipments/:id/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { status } = req.body;

    if (!["in_progress", "complete", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [shipment] = await db
      .update(shipmentsTable)
      .set({ status })
      .where(eq(shipmentsTable.id, id))
      .returning();

    if (!shipment) return res.status(404).json({ error: "Shipment not found" });
    return res.json(formatShipment(shipment));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update shipment status" });
  }
});

router.patch("/shipments/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { client, productDescription, yieldSoldKg, revenueUsd, shippingDate, status } = req.body;

    const updateData: Partial<typeof shipmentsTable.$inferInsert> = {};
    if (client !== undefined) updateData.client = client;
    if (productDescription !== undefined) updateData.productDescription = productDescription;
    if (yieldSoldKg !== undefined) updateData.yieldSoldKg = yieldSoldKg ? String(yieldSoldKg) : null;
    if (revenueUsd !== undefined) updateData.revenueUsd = revenueUsd ? String(revenueUsd) : null;
    if (shippingDate !== undefined) updateData.shippingDate = shippingDate;
    if (status !== undefined) {
      if (!["in_progress", "complete", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updateData.status = status;
    }

    const [shipment] = await db
      .update(shipmentsTable)
      .set(updateData)
      .where(eq(shipmentsTable.id, id))
      .returning();

    if (!shipment) return res.status(404).json({ error: "Shipment not found" });
    return res.json(formatShipment(shipment));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update shipment" });
  }
});

router.delete("/shipments/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const [shipment] = await db
      .delete(shipmentsTable)
      .where(eq(shipmentsTable.id, id))
      .returning();

    if (!shipment) return res.status(404).json({ error: "Shipment not found" });
    return res.json({ ok: true, id });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete shipment" });
  }
});

export default router;
