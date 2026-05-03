import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  inspectionsTable,
  findingsTable,
  venuesTable,
  violationCategoriesTable,
  violationSubCategoriesTable,
} from "@workspace/db";
import {
  AddFindingBody,
  UpdateFindingBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function serializeFinding(id: number) {
  const rows = await db
    .select({
      id: findingsTable.id,
      inspectionId: findingsTable.inspectionId,
      clipName: findingsTable.clipName,
      clipNumber: findingsTable.clipNumber,
      outcome: findingsTable.outcome,
      categoryId: findingsTable.categoryId,
      categoryName: violationCategoriesTable.name,
      subCategoryId: findingsTable.subCategoryId,
      subCategoryName: violationSubCategoriesTable.name,
      severity: findingsTable.severity,
      notes: findingsTable.notes,
      createdAt: findingsTable.createdAt,
    })
    .from(findingsTable)
    .leftJoin(
      violationCategoriesTable,
      eq(violationCategoriesTable.id, findingsTable.categoryId),
    )
    .leftJoin(
      violationSubCategoriesTable,
      eq(violationSubCategoriesTable.id, findingsTable.subCategoryId),
    )
    .where(eq(findingsTable.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const f = rows[0];
  return {
    id: f.id,
    inspectionId: f.inspectionId,
    clipName: f.clipName,
    clipNumber: f.clipNumber,
    outcome: f.outcome,
    categoryId: f.categoryId,
    categoryName: f.categoryName,
    subCategoryId: f.subCategoryId,
    subCategoryName: f.subCategoryName,
    severity: f.severity,
    notes: f.notes,
    createdAt: f.createdAt.toISOString(),
  };
}

router.post("/inspections/:id/findings", requireAuth, async (req, res) => {
  const inspectionId = Number(req.params.id);
  if (!Number.isInteger(inspectionId))
    return res.status(400).json({ error: "Invalid id" });
  const parsed = AddFindingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

  const insp = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.id, inspectionId))
    .limit(1);
  if (insp.length === 0)
    return res.status(404).json({ error: "Inspection not found" });
  const i = insp[0];
  if (req.user!.role !== "admin" && i.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (i.status === "completed") {
    return res
      .status(400)
      .json({ error: "Inspection is completed and cannot accept new findings" });
  }

  const { outcome, categoryId, subCategoryId, severity, notes } = parsed.data;
  if (outcome === "violation" && (!categoryId || !subCategoryId)) {
    return res
      .status(400)
      .json({ error: "Violations require category and sub-category" });
  }

  const finding = await db.transaction(async (tx) => {
    const [venue] = await tx
      .update(venuesTable)
      .set({ nextClipNumber: sql`${venuesTable.nextClipNumber} + 1` })
      .where(eq(venuesTable.id, i.venueId))
      .returning();
    const clipNumber = venue.nextClipNumber - 1;
    const clipName = `${venue.code}_${String(clipNumber).padStart(3, "0")}`;
    const [created] = await tx
      .insert(findingsTable)
      .values({
        inspectionId,
        venueId: i.venueId,
        clipNumber,
        clipName,
        outcome,
        categoryId: outcome === "violation" ? categoryId ?? null : null,
        subCategoryId: outcome === "violation" ? subCategoryId ?? null : null,
        severity: outcome === "violation" ? severity ?? null : null,
        notes: notes ?? null,
        clientId: typeof req.body?.clientId === "string" ? req.body.clientId : null,
      })
      .returning();
    return created;
  });

  const full = await serializeFinding(finding.id);
  res.status(201).json(full);
});

router.patch("/findings/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateFindingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

  const rows = await db
    .select({
      finding: findingsTable,
      inspection: inspectionsTable,
    })
    .from(findingsTable)
    .innerJoin(
      inspectionsTable,
      eq(inspectionsTable.id, findingsTable.inspectionId),
    )
    .where(eq(findingsTable.id, id))
    .limit(1);
  if (rows.length === 0)
    return res.status(404).json({ error: "Finding not found" });
  const { inspection } = rows[0];
  if (req.user!.role !== "admin" && inspection.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (inspection.status === "completed" && req.user!.role !== "admin") {
    return res
      .status(400)
      .json({ error: "Cannot edit findings on a completed inspection" });
  }

  const updates: Partial<typeof findingsTable.$inferInsert> = {};
  const existing = rows[0].finding;
  const outcome = parsed.data.outcome ?? existing.outcome;
  if (parsed.data.outcome !== undefined) updates.outcome = parsed.data.outcome;
  if (outcome === "no_violation") {
    updates.categoryId = null;
    updates.subCategoryId = null;
    updates.severity = null;
  } else {
    if (parsed.data.categoryId !== undefined)
      updates.categoryId = parsed.data.categoryId;
    if (parsed.data.subCategoryId !== undefined)
      updates.subCategoryId = parsed.data.subCategoryId;
    if (parsed.data.severity !== undefined)
      updates.severity = parsed.data.severity ?? null;
    const finalCategoryId =
      updates.categoryId !== undefined ? updates.categoryId : existing.categoryId;
    const finalSubCategoryId =
      updates.subCategoryId !== undefined
        ? updates.subCategoryId
        : existing.subCategoryId;
    const finalSeverity =
      updates.severity !== undefined ? updates.severity : existing.severity;
    if (!finalCategoryId || !finalSubCategoryId || !finalSeverity) {
      return res.status(400).json({
        error: "Violation findings require category, sub-category and severity",
      });
    }
  }
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  if (Object.keys(updates).length > 0) {
    await db.update(findingsTable).set(updates).where(eq(findingsTable.id, id));
  }
  const full = await serializeFinding(id);
  res.json(full);
});

router.delete("/findings/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select({
      finding: findingsTable,
      inspection: inspectionsTable,
    })
    .from(findingsTable)
    .innerJoin(
      inspectionsTable,
      eq(inspectionsTable.id, findingsTable.inspectionId),
    )
    .where(eq(findingsTable.id, id))
    .limit(1);
  if (rows.length === 0) return res.status(204).end();
  const { inspection } = rows[0];
  if (req.user!.role !== "admin" && inspection.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (inspection.status === "completed" && req.user!.role !== "admin") {
    return res
      .status(400)
      .json({ error: "Cannot delete findings on a completed inspection" });
  }
  await db.delete(findingsTable).where(eq(findingsTable.id, id));
  res.status(204).end();
});

export default router;
