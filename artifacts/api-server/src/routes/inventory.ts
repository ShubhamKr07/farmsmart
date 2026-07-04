import { Router, type Request, type Response } from "express";
import { eq, gt, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { inventoryItemsTable } from "@workspace/db";

const router = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function formatItem(item: typeof inventoryItemsTable.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand ?? null,
    category: item.category ?? null,
    qrCode: item.qrCode ?? null,
    currentQty: Number(item.currentQty),
    maxQty: Number(item.maxQty),
    unit: item.unit,
    arrivalDate: item.arrivalDate ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

router.get("/inventory", async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;
    const limit = Math.min(
      MAX_LIMIT,
      req.query.limit ? parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
    );

    // Keyset pagination on id. No `cursor`/`limit` param = first page, same
    // flat-array shape as before pagination existed.
    const conditions = cursor !== undefined ? [gt(inventoryItemsTable.id, cursor)] : [];

    const rows = await db
      .select()
      .from(inventoryItemsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(inventoryItemsTable.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;

    if (req.query.cursor === undefined && req.query.limit === undefined) {
      return res.json(page.map(formatItem));
    }
    return res.json({ items: page.map(formatItem), nextCursor });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

router.post("/inventory", async (req: Request, res: Response) => {
  try {
    const { name, brand, category, qrCode, currentQty, maxQty, unit, arrivalDate } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const [item] = await db
      .insert(inventoryItemsTable)
      .values({
        name,
        brand: brand ?? null,
        category: category ?? null,
        qrCode: qrCode ?? null,
        currentQty: String(currentQty ?? 0),
        maxQty: String(maxQty ?? 0),
        unit: unit ?? "g",
        arrivalDate: arrivalDate ?? null,
      })
      .returning();

    return res.status(201).json(formatItem(item));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create inventory item" });
  }
});

router.patch("/inventory/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { name, brand, category, currentQty, maxQty, unit } = req.body;

    const updateData: Partial<typeof inventoryItemsTable.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (category !== undefined) updateData.category = category;
    if (currentQty !== undefined) updateData.currentQty = String(currentQty);
    if (maxQty !== undefined) updateData.maxQty = String(maxQty);
    if (unit !== undefined) updateData.unit = unit;

    const [item] = await db
      .update(inventoryItemsTable)
      .set(updateData)
      .where(eq(inventoryItemsTable.id, id))
      .returning();

    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json(formatItem(item));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update inventory item" });
  }
});

router.delete("/inventory/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const [item] = await db
      .delete(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, id))
      .returning();

    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json({ ok: true, id });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete inventory item" });
  }
});

export default router;
