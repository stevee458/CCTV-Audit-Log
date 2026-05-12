import { Router, type IRouter } from "express";
import { asc, eq, count } from "drizzle-orm";
import {
  db,
  depotsTable,
  venuesTable,
  assetsTable,
  inspectionsTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

async function buildDepotsResponse() {
  const depots = await db.select().from(depotsTable).orderBy(asc(depotsTable.id));
  const venues = await db.select().from(venuesTable).orderBy(asc(venuesTable.depotId), asc(venuesTable.id));
  const cameras = await db
    .select({
      id: assetsTable.id,
      venueId: assetsTable.venueId,
      label: assetsTable.label,
      status: assetsTable.status,
    })
    .from(assetsTable)
    .where(eq(assetsTable.type, "Camera"))
    .orderBy(asc(assetsTable.venueId), asc(assetsTable.id));

  return depots.map((d) => ({
    id: d.id,
    name: d.name,
    venues: venues
      .filter((v) => v.depotId === d.id)
      .map((v) => ({
        id: v.id,
        name: v.name,
        code: v.code,
        cameras: cameras
          .filter((c) => c.venueId === v.id)
          .map((c) => ({ id: c.id, label: c.label, status: c.status })),
      })),
  }));
}

router.get("/depots", requireAuth, async (_req, res) => {
  const data = await buildDepotsResponse();
  res.json(data);
});

router.post("/depots", requireAdmin, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const [created] = await db.insert(depotsTable).values({ name: name.trim() }).returning();
  res.status(201).json(created);
});

router.patch("/depots/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const [updated] = await db.update(depotsTable).set({ name: name.trim() }).where(eq(depotsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Depot not found" });
  res.json(updated);
});

router.delete("/depots/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const [{ venueCount }] = await db
    .select({ venueCount: count() })
    .from(venuesTable)
    .where(eq(venuesTable.depotId, id));
  if (Number(venueCount) > 0) {
    return res.status(409).json({ error: "Cannot delete depot that still has venues. Remove all venues first." });
  }
  const [deleted] = await db.delete(depotsTable).where(eq(depotsTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Depot not found" });
  res.json({ ok: true });
});

router.post("/depots/:depotId/venues", requireAdmin, async (req, res) => {
  const depotId = Number(req.params.depotId);
  if (!Number.isInteger(depotId)) return res.status(400).json({ error: "Invalid depotId" });
  const { name, code } = req.body as { name?: string; code?: string };
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  if (!code?.trim()) return res.status(400).json({ error: "code is required" });
  const [depot] = await db.select().from(depotsTable).where(eq(depotsTable.id, depotId));
  if (!depot) return res.status(404).json({ error: "Depot not found" });
  try {
    const [created] = await db
      .insert(venuesTable)
      .values({ depotId, name: name.trim(), code: code.trim().toUpperCase() })
      .returning();
    res.status(201).json(created);
  } catch {
    res.status(409).json({ error: "Venue code must be unique across all venues" });
  }
});

router.patch("/venues/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const body = req.body as { name?: string; code?: string };
  const updates: Partial<typeof venuesTable.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });
  try {
    const [updated] = await db.update(venuesTable).set(updates).where(eq(venuesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Venue not found" });
    res.json(updated);
  } catch {
    res.status(409).json({ error: "Venue code must be unique across all venues" });
  }
});

router.delete("/venues/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const [{ inspCount }] = await db
    .select({ inspCount: count() })
    .from(inspectionsTable)
    .where(eq(inspectionsTable.venueId, id));
  if (Number(inspCount) > 0) {
    return res.status(409).json({ error: "Cannot remove venue that has inspection history." });
  }
  const [deleted] = await db.delete(venuesTable).where(eq(venuesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Venue not found" });
  res.json({ ok: true });
});

export default router;
