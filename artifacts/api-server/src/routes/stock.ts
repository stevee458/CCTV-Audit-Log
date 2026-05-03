import { Router, type IRouter } from "express";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import {
  db,
  stockSkusTable,
  stockRequestsTable,
  stockPurchasesTable,
  stockMovementsTable,
  usersTable,
} from "@workspace/db";
import {
  requireAuth,
  requireAdmin,
  requireMaintenance,
} from "../middlewares/auth";
import { sendCsv } from "../lib/csv";

const router: IRouter = Router();

router.get("/stock/skus", requireAuth, async (req, res) => {
  const conds = [];
  if (req.query.kind) conds.push(eq(stockSkusTable.kind, String(req.query.kind)));
  const rows = await db
    .select()
    .from(stockSkusTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(stockSkusTable.kind), asc(stockSkusTable.name));
  res.json(rows);
});

router.get("/stock/skus/export.csv", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(stockSkusTable).orderBy(asc(stockSkusTable.name));
  sendCsv(res, "stock_skus.csv",
    ["SKU ID", "Name", "Kind", "Category", "Description", "On Hand"],
    rows.map((r) => [r.id, r.name, r.kind, r.category ?? "", r.description ?? "", r.onHand]));
});

router.post("/stock/skus", requireAdmin, async (req, res) => {
  const { name, kind, category, description, onHand } = req.body;
  if (!name || !kind) return res.status(400).json({ error: "name and kind required" });
  const [created] = await db
    .insert(stockSkusTable)
    .values({
      name: String(name),
      kind: String(kind),
      category: category ?? null,
      description: description ?? null,
      onHand: onHand ?? 0,
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/stock/skus/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const updates: Partial<typeof stockSkusTable.$inferInsert> = {};
  for (const k of ["name", "kind", "category", "description"]) {
    if (k in req.body) (updates as any)[k] = req.body[k];
  }
  const [updated] = await db.update(stockSkusTable).set(updates).where(eq(stockSkusTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "SKU not found" });
  res.json(updated);
});

// Stock requests
async function listStockRequests(filters: { status?: string }) {
  const conds = [];
  if (filters.status) conds.push(eq(stockRequestsTable.status, filters.status));
  const rows = await db
    .select({
      id: stockRequestsTable.id,
      skuId: stockRequestsTable.skuId,
      skuName: stockSkusTable.name,
      skuKind: stockSkusTable.kind,
      requestedBy: stockRequestsTable.requestedBy,
      requesterName: usersTable.name,
      quantity: stockRequestsTable.quantity,
      reason: stockRequestsTable.reason,
      status: stockRequestsTable.status,
      createdAt: stockRequestsTable.createdAt,
      updatedAt: stockRequestsTable.updatedAt,
    })
    .from(stockRequestsTable)
    .innerJoin(stockSkusTable, eq(stockSkusTable.id, stockRequestsTable.skuId))
    .innerJoin(usersTable, eq(usersTable.id, stockRequestsTable.requestedBy))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stockRequestsTable.createdAt));
  return rows.map((r) => ({
    id: r.id,
    skuId: r.skuId,
    skuName: r.skuName,
    skuKind: r.skuKind,
    requestedBy: r.requestedBy,
    requesterName: r.requesterName,
    quantity: r.quantity,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

router.get("/stock/requests", requireAuth, async (req, res) => {
  const list = await listStockRequests({
    status: req.query.status ? String(req.query.status) : undefined,
  });
  res.json(list);
});

router.get("/stock/requests/export.csv", requireAdmin, async (req, res) => {
  const list = await listStockRequests({
    status: req.query.status ? String(req.query.status) : undefined,
  });
  sendCsv(res, "stock_requests.csv",
    ["ID", "SKU", "Kind", "Requester", "Quantity", "Reason", "Status", "Created", "Updated"],
    list.map((r) => [r.id, r.skuName, r.skuKind, r.requesterName, r.quantity, r.reason ?? "", r.status, r.createdAt, r.updatedAt]));
});

router.post("/stock/requests", requireMaintenance, async (req, res) => {
  const skuId = Number(req.body.skuId);
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(skuId) || !Number.isInteger(quantity) || quantity <= 0)
    return res.status(400).json({ error: "skuId and positive quantity required" });
  const [created] = await db
    .insert(stockRequestsTable)
    .values({
      skuId,
      quantity,
      requestedBy: req.user!.id,
      reason: req.body.reason ?? null,
    })
    .returning();
  res.status(201).json(created);
});

router.post("/stock/requests/:id/reject", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(stockRequestsTable)
    .set({ status: "Rejected", updatedAt: new Date() })
    .where(eq(stockRequestsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

// Admin records purchase against a stock request → status=Ordered
router.post("/stock/requests/:id/purchase", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { quantity, unitCostCents, supplier, poRef, expectedAt } = req.body;
  const qty = Number(quantity);
  const unitCost = Number(unitCostCents);
  if (!Number.isInteger(qty) || qty <= 0 || !Number.isInteger(unitCost) || unitCost < 0)
    return res.status(400).json({ error: "quantity and unitCostCents required" });
  const [request] = await db.select().from(stockRequestsTable).where(eq(stockRequestsTable.id, id)).limit(1);
  if (!request) return res.status(404).json({ error: "Request not found" });
  await db.transaction(async (tx) => {
    await tx.insert(stockPurchasesTable).values({
      requestId: id,
      skuId: request.skuId,
      quantity: qty,
      unitCost,
      totalCost: qty * unitCost,
      supplier: supplier ?? null,
      poRef: poRef ?? null,
      expectedAt: expectedAt ?? null,
      recordedBy: req.user!.id,
    });
    await tx
      .update(stockRequestsTable)
      .set({ status: "Ordered", updatedAt: new Date() })
      .where(eq(stockRequestsTable.id, id));
  });
  res.json({ ok: true });
});

// Maintenance confirms collection → on-hand += qty, status=Collected
router.post("/stock/purchases/:id/collect", requireMaintenance, async (req, res) => {
  const id = Number(req.params.id);
  await db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(stockPurchasesTable).where(eq(stockPurchasesTable.id, id)).limit(1);
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.collectedAt) throw new Error("Already collected");
    const now = new Date();
    await tx.update(stockPurchasesTable).set({ collectedAt: now }).where(eq(stockPurchasesTable.id, id));
    await tx
      .update(stockSkusTable)
      .set({ onHand: sql`${stockSkusTable.onHand} + ${purchase.quantity}` })
      .where(eq(stockSkusTable.id, purchase.skuId));
    await tx.insert(stockMovementsTable).values({
      skuId: purchase.skuId,
      changeQty: purchase.quantity,
      reason: "collection",
      refTable: "stock_purchases",
      refId: id,
      createdBy: req.user!.id,
    });
    if (purchase.requestId) {
      await tx.update(stockRequestsTable)
        .set({ status: "Collected", updatedAt: now })
        .where(eq(stockRequestsTable.id, purchase.requestId));
    }
  });
  res.json({ ok: true });
});

router.get("/stock/purchases", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      id: stockPurchasesTable.id,
      skuId: stockPurchasesTable.skuId,
      skuName: stockSkusTable.name,
      quantity: stockPurchasesTable.quantity,
      unitCostCents: stockPurchasesTable.unitCost,
      totalCostCents: stockPurchasesTable.totalCost,
      supplier: stockPurchasesTable.supplier,
      poRef: stockPurchasesTable.poRef,
      expectedAt: stockPurchasesTable.expectedAt,
      collectedAt: stockPurchasesTable.collectedAt,
      createdAt: stockPurchasesTable.createdAt,
    })
    .from(stockPurchasesTable)
    .innerJoin(stockSkusTable, eq(stockSkusTable.id, stockPurchasesTable.skuId))
    .orderBy(desc(stockPurchasesTable.createdAt));
  res.json(rows.map((r) => ({
    ...r,
    expectedAt: r.expectedAt,
    collectedAt: r.collectedAt ? r.collectedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/stock/purchases/export.csv", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: stockPurchasesTable.id,
      skuName: stockSkusTable.name,
      quantity: stockPurchasesTable.quantity,
      unitCost: stockPurchasesTable.unitCost,
      totalCost: stockPurchasesTable.totalCost,
      supplier: stockPurchasesTable.supplier,
      poRef: stockPurchasesTable.poRef,
      expectedAt: stockPurchasesTable.expectedAt,
      collectedAt: stockPurchasesTable.collectedAt,
      createdAt: stockPurchasesTable.createdAt,
    })
    .from(stockPurchasesTable)
    .innerJoin(stockSkusTable, eq(stockSkusTable.id, stockPurchasesTable.skuId))
    .orderBy(desc(stockPurchasesTable.createdAt));
  sendCsv(res, "stock_purchases.csv",
    ["ID", "SKU", "Qty", "Unit Cost (cents)", "Total Cost (cents)", "Supplier", "PO Ref", "Expected", "Collected", "Created"],
    rows.map((r) => [r.id, r.skuName, r.quantity, r.unitCost, r.totalCost, r.supplier ?? "", r.poRef ?? "", r.expectedAt ?? "", r.collectedAt ? r.collectedAt.toISOString() : "", r.createdAt.toISOString()]));
});

// Stock adjustments / movements
router.get("/stock/movements", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      id: stockMovementsTable.id,
      skuId: stockMovementsTable.skuId,
      skuName: stockSkusTable.name,
      changeQty: stockMovementsTable.changeQty,
      reason: stockMovementsTable.reason,
      notes: stockMovementsTable.notes,
      refTable: stockMovementsTable.refTable,
      refId: stockMovementsTable.refId,
      createdBy: stockMovementsTable.createdBy,
      createdByName: usersTable.name,
      createdAt: stockMovementsTable.createdAt,
    })
    .from(stockMovementsTable)
    .innerJoin(stockSkusTable, eq(stockSkusTable.id, stockMovementsTable.skuId))
    .innerJoin(usersTable, eq(usersTable.id, stockMovementsTable.createdBy))
    .orderBy(desc(stockMovementsTable.createdAt))
    .limit(500);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/stock/movements/export.csv", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: stockMovementsTable.id,
      skuName: stockSkusTable.name,
      changeQty: stockMovementsTable.changeQty,
      reason: stockMovementsTable.reason,
      notes: stockMovementsTable.notes,
      createdByName: usersTable.name,
      createdAt: stockMovementsTable.createdAt,
    })
    .from(stockMovementsTable)
    .innerJoin(stockSkusTable, eq(stockSkusTable.id, stockMovementsTable.skuId))
    .innerJoin(usersTable, eq(usersTable.id, stockMovementsTable.createdBy))
    .orderBy(desc(stockMovementsTable.createdAt));
  sendCsv(res, "stock_movements.csv",
    ["ID", "SKU", "Change", "Reason", "Notes", "By", "Created"],
    rows.map((r) => [r.id, r.skuName, r.changeQty, r.reason, r.notes ?? "", r.createdByName, r.createdAt.toISOString()]));
});

// Admin stock check / adjustment
router.post("/stock/skus/:id/adjust", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const counted = Number(req.body.counted);
  const reason = req.body.reason ? String(req.body.reason) : "stock_check";
  if (!Number.isInteger(counted) || counted < 0)
    return res.status(400).json({ error: "counted (>=0) required" });
  await db.transaction(async (tx) => {
    const [sku] = await tx.select().from(stockSkusTable).where(eq(stockSkusTable.id, id)).limit(1);
    if (!sku) throw new Error("SKU not found");
    const variance = counted - sku.onHand;
    await tx.update(stockSkusTable).set({ onHand: counted }).where(eq(stockSkusTable.id, id));
    await tx.insert(stockMovementsTable).values({
      skuId: id,
      changeQty: variance,
      reason: "adjustment",
      notes: reason,
      createdBy: req.user!.id,
    });
  });
  res.json({ ok: true });
});

export default router;
