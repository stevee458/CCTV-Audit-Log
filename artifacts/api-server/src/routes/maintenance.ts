import { Router, type IRouter } from "express";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import {
  db,
  maintenanceVisitsTable,
  venueInspectionVisitsTable,
  repairEventsTable,
  repairConsumptionTable,
  depotsTable,
  venuesTable,
  usersTable,
  assetsTable,
  stockSkusTable,
  stockMovementsTable,
} from "@workspace/db";
import { requireAuth, requireMaintenance, requireAdmin } from "../middlewares/auth";
import { sendCsv } from "../lib/csv";

const router: IRouter = Router();

async function listVisits() {
  const rows = await db
    .select({
      id: maintenanceVisitsTable.id,
      maintainerId: maintenanceVisitsTable.maintainerId,
      maintainerName: usersTable.name,
      depotId: maintenanceVisitsTable.depotId,
      depotName: depotsTable.name,
      visitDate: maintenanceVisitsTable.visitDate,
      notes: maintenanceVisitsTable.notes,
      createdAt: maintenanceVisitsTable.createdAt,
    })
    .from(maintenanceVisitsTable)
    .innerJoin(usersTable, eq(usersTable.id, maintenanceVisitsTable.maintainerId))
    .innerJoin(depotsTable, eq(depotsTable.id, maintenanceVisitsTable.depotId))
    .orderBy(desc(maintenanceVisitsTable.visitDate));
  return rows.map((r) => ({
    ...r,
    visitDate: r.visitDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

router.get("/maintenance/visits", requireAuth, async (_req, res) => {
  res.json(await listVisits());
});

router.get("/maintenance/visits/export.csv", requireAdmin, async (_req, res) => {
  const list = await listVisits();
  sendCsv(res, "maintenance_visits.csv",
    ["ID", "Maintainer", "Depot", "Visit Date", "Notes", "Created"],
    list.map((r) => [r.id, r.maintainerName, r.depotName, r.visitDate, r.notes ?? "", r.createdAt]));
});

router.post("/maintenance/visits", requireMaintenance, async (req, res) => {
  const depotId = Number(req.body.depotId);
  const visitDate = req.body.visitDate ? new Date(req.body.visitDate) : new Date();
  if (!Number.isInteger(depotId)) return res.status(400).json({ error: "depotId required" });
  const [created] = await db
    .insert(maintenanceVisitsTable)
    .values({
      maintainerId: req.user!.id,
      depotId,
      visitDate,
      notes: req.body.notes ?? null,
    })
    .returning();
  res.status(201).json(created);
});

router.get("/maintenance/visits/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const [visit] = await db
    .select({
      id: maintenanceVisitsTable.id,
      maintainerId: maintenanceVisitsTable.maintainerId,
      maintainerName: usersTable.name,
      depotId: maintenanceVisitsTable.depotId,
      depotName: depotsTable.name,
      visitDate: maintenanceVisitsTable.visitDate,
      notes: maintenanceVisitsTable.notes,
      createdAt: maintenanceVisitsTable.createdAt,
    })
    .from(maintenanceVisitsTable)
    .innerJoin(usersTable, eq(usersTable.id, maintenanceVisitsTable.maintainerId))
    .innerJoin(depotsTable, eq(depotsTable.id, maintenanceVisitsTable.depotId))
    .where(eq(maintenanceVisitsTable.id, id));
  if (!visit) return res.status(404).json({ error: "Visit not found" });

  const venueVisits = await db
    .select({
      id: venueInspectionVisitsTable.id,
      visitId: venueInspectionVisitsTable.visitId,
      venueId: venueInspectionVisitsTable.venueId,
      venueName: venuesTable.name,
      venueCode: venuesTable.code,
      visitedAt: venueInspectionVisitsTable.visitedAt,
      notes: venueInspectionVisitsTable.notes,
    })
    .from(venueInspectionVisitsTable)
    .innerJoin(venuesTable, eq(venuesTable.id, venueInspectionVisitsTable.venueId))
    .where(eq(venueInspectionVisitsTable.visitId, id))
    .orderBy(asc(venueInspectionVisitsTable.visitedAt));

  const repairs = await db
    .select({
      id: repairEventsTable.id,
      venueId: repairEventsTable.venueId,
      venueName: venuesTable.name,
      assetId: repairEventsTable.assetId,
      assetLabel: assetsTable.label,
      action: repairEventsTable.action,
      description: repairEventsTable.description,
      partsCostCents: repairEventsTable.partsCostCents,
      labourCostCents: repairEventsTable.labourCostCents,
      clientChargeCents: repairEventsTable.clientChargeCents,
      occurredAt: repairEventsTable.occurredAt,
    })
    .from(repairEventsTable)
    .innerJoin(venuesTable, eq(venuesTable.id, repairEventsTable.venueId))
    .leftJoin(assetsTable, eq(assetsTable.id, repairEventsTable.assetId))
    .where(eq(repairEventsTable.visitId, id))
    .orderBy(asc(repairEventsTable.occurredAt));

  res.json({
    ...visit,
    visitDate: visit.visitDate.toISOString(),
    createdAt: visit.createdAt.toISOString(),
    venueVisits: venueVisits.map((v) => ({ ...v, visitedAt: v.visitedAt.toISOString() })),
    repairs: repairs.map((r) => ({ ...r, occurredAt: r.occurredAt.toISOString() })),
  });
});

router.post("/maintenance/visits/:id/venues", requireMaintenance, async (req, res) => {
  const visitId = Number(req.params.id);
  const venueId = Number(req.body.venueId);
  if (!Number.isInteger(visitId) || !Number.isInteger(venueId))
    return res.status(400).json({ error: "venueId required" });
  const [created] = await db
    .insert(venueInspectionVisitsTable)
    .values({
      visitId,
      venueId,
      visitedAt: req.body.visitedAt ? new Date(req.body.visitedAt) : new Date(),
      notes: req.body.notes ?? null,
    })
    .returning();
  res.status(201).json(created);
});

// Repair events
async function listRepairs() {
  const rows = await db
    .select({
      id: repairEventsTable.id,
      visitId: repairEventsTable.visitId,
      venueId: repairEventsTable.venueId,
      venueName: venuesTable.name,
      venueCode: venuesTable.code,
      assetId: repairEventsTable.assetId,
      assetLabel: assetsTable.label,
      action: repairEventsTable.action,
      description: repairEventsTable.description,
      partsCostCents: repairEventsTable.partsCostCents,
      labourCostCents: repairEventsTable.labourCostCents,
      clientChargeCents: repairEventsTable.clientChargeCents,
      occurredAt: repairEventsTable.occurredAt,
      createdBy: repairEventsTable.createdBy,
      createdByName: usersTable.name,
    })
    .from(repairEventsTable)
    .innerJoin(venuesTable, eq(venuesTable.id, repairEventsTable.venueId))
    .leftJoin(assetsTable, eq(assetsTable.id, repairEventsTable.assetId))
    .innerJoin(usersTable, eq(usersTable.id, repairEventsTable.createdBy))
    .orderBy(desc(repairEventsTable.occurredAt));
  return rows.map((r) => ({ ...r, occurredAt: r.occurredAt.toISOString() }));
}

router.get("/maintenance/repairs", requireAuth, async (_req, res) => {
  res.json(await listRepairs());
});

router.get("/maintenance/repairs/export.csv", requireAdmin, async (_req, res) => {
  const list = await listRepairs();
  sendCsv(res, "repairs.csv",
    ["ID", "Visit", "Venue", "Asset", "Action", "Description", "Parts (cents)", "Labour (cents)", "Client Charge (cents)", "Occurred At", "By"],
    list.map((r) => [r.id, r.visitId ?? "", r.venueName, r.assetLabel ?? "", r.action, r.description ?? "", r.partsCostCents, r.labourCostCents, r.clientChargeCents, r.occurredAt, r.createdByName]));
});

router.post("/maintenance/repairs", requireMaintenance, async (req, res) => {
  const venueId = Number(req.body.venueId);
  const action = String(req.body.action ?? "");
  if (!Number.isInteger(venueId) || !["repair", "replace"].includes(action))
    return res.status(400).json({ error: "venueId and action (repair|replace) required" });

  const consumption: Array<{ skuId: number; quantity: number }> = Array.isArray(req.body.consumption)
    ? req.body.consumption
    : [];

  const result = await db.transaction(async (tx) => {
    let partsCost = Number(req.body.partsCostCents) || 0;
    // Validate stock availability
    for (const c of consumption) {
      const [sku] = await tx.select().from(stockSkusTable).where(eq(stockSkusTable.id, c.skuId)).limit(1);
      if (!sku) throw new Error(`SKU ${c.skuId} not found`);
      if (sku.onHand < c.quantity) throw new Error(`Insufficient stock for ${sku.name}`);
    }
    const [repair] = await tx
      .insert(repairEventsTable)
      .values({
        visitId: req.body.visitId ? Number(req.body.visitId) : null,
        venueId,
        assetId: req.body.assetId ? Number(req.body.assetId) : null,
        action,
        description: req.body.description ?? null,
        partsCostCents: partsCost,
        labourCostCents: Number(req.body.labourCostCents) || 0,
        clientChargeCents: Number(req.body.clientChargeCents) || 0,
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
        createdBy: req.user!.id,
      })
      .returning();
    for (const c of consumption) {
      await tx.insert(repairConsumptionTable).values({
        repairId: repair.id,
        skuId: c.skuId,
        quantity: c.quantity,
        unitCostCents: 0,
      });
      await tx
        .update(stockSkusTable)
        .set({ onHand: sql`${stockSkusTable.onHand} - ${c.quantity}` })
        .where(eq(stockSkusTable.id, c.skuId));
      await tx.insert(stockMovementsTable).values({
        skuId: c.skuId,
        changeQty: -c.quantity,
        reason: "consumption",
        refTable: "repair_events",
        refId: repair.id,
        createdBy: req.user!.id,
      });
    }
    return repair;
  });
  res.status(201).json(result);
});

export default router;
