import { Router, type IRouter } from "express";
import { and, eq, asc, ilike } from "drizzle-orm";
import { db, assetsTable, venuesTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { sendCsv } from "../lib/csv";

const router: IRouter = Router();

async function listAssets(filters: { venueId?: number; type?: string; status?: string; search?: string }) {
  const conds = [];
  if (filters.venueId) conds.push(eq(assetsTable.venueId, filters.venueId));
  if (filters.type) conds.push(eq(assetsTable.type, filters.type));
  if (filters.status) conds.push(eq(assetsTable.status, filters.status));
  if (filters.search) conds.push(ilike(assetsTable.label, `%${filters.search}%`));
  const rows = await db
    .select({
      id: assetsTable.id,
      venueId: assetsTable.venueId,
      venueName: venuesTable.name,
      venueCode: venuesTable.code,
      type: assetsTable.type,
      label: assetsTable.label,
      serial: assetsTable.serial,
      installedAt: assetsTable.installedAt,
      status: assetsTable.status,
      notes: assetsTable.notes,
      createdAt: assetsTable.createdAt,
    })
    .from(assetsTable)
    .innerJoin(venuesTable, eq(venuesTable.id, assetsTable.venueId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(assetsTable.venueId), asc(assetsTable.type), asc(assetsTable.id));
  return rows.map((r) => ({
    id: r.id,
    venueId: r.venueId,
    venueName: r.venueName,
    venueCode: r.venueCode,
    type: r.type,
    label: r.label,
    serial: r.serial,
    installedAt: r.installedAt,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));
}

router.get("/assets", requireAuth, async (req, res) => {
  const list = await listAssets({
    venueId: req.query.venueId ? Number(req.query.venueId) : undefined,
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
  });
  res.json(list);
});

router.get("/assets/export.csv", requireAdmin, async (req, res) => {
  const list = await listAssets({
    venueId: req.query.venueId ? Number(req.query.venueId) : undefined,
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
  });
  sendCsv(res, "assets_export.csv",
    ["Asset ID", "Venue", "Venue Code", "Type", "Label", "Serial", "Installed At", "Status", "Notes"],
    list.map((a) => [a.id, a.venueName, a.venueCode, a.type, a.label, a.serial ?? "", a.installedAt ?? "", a.status, a.notes ?? ""]));
});

router.post("/assets", requireAdmin, async (req, res) => {
  const { venueId, type, label, serial, installedAt, status, notes } = req.body;
  if (!venueId || !type || !label) return res.status(400).json({ error: "venueId, type, label required" });
  const [created] = await db
    .insert(assetsTable)
    .values({
      venueId: Number(venueId),
      type: String(type),
      label: String(label),
      serial: serial ?? null,
      installedAt: installedAt ?? null,
      status: status ?? "Operational",
      notes: notes ?? null,
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/assets/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const updates: Partial<typeof assetsTable.$inferInsert> = {};
  const body = req.body as Record<string, unknown>;
  if ("label" in body) updates.label = body.label as string;
  if ("serial" in body) updates.serial = body.serial as string | null;
  if ("status" in body) updates.status = body.status as string;
  if ("notes" in body) updates.notes = body.notes as string | null;
  if ("type" in body) updates.type = body.type as string;
  if ("installedAt" in body) updates.installedAt = body.installedAt as string | null;
  const [updated] = await db.update(assetsTable).set(updates).where(eq(assetsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Asset not found" });
  res.json(updated);
});

export default router;
