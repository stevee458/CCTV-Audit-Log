import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  inspectionsTable,
  findingsTable,
  venuesTable,
  violationCategoriesTable,
} from "@workspace/db";
import {
  AddFindingBody,
  UpdateFindingBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const isAdminRole = (r: string) => r === "admin" || r === "super_admin";

function formatClipSeq(n: number): string {
  const idx = n - 1;
  const letterIdx = Math.floor(idx / 99);
  const num = (idx % 99) + 1;
  const letter = String.fromCharCode(65 + letterIdx);
  return `${letter}${String(num).padStart(2, "0")}`;
}

function buildClipName(
  venueCode: string,
  clipNumber: number,
  createdAt: Date,
  outcome: string,
  categoryName: string | null,
  severity: string | null,
): string {
  const seq = formatClipSeq(clipNumber);
  const dd = String(createdAt.getUTCDate()).padStart(2, "0");
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  const dateStr = `${dd}${mm}`;
  if (outcome === "no_violation") {
    return `${venueCode}_${seq} ${dateStr} NV-E`;
  }
  const catStr = (categoryName ?? "Unknown").replace(/\s+/g, "").slice(0, 8);
  const sevStr = severity ?? "";
  return `${venueCode}_${seq} ${dateStr} ${catStr}-${sevStr}`;
}

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
      severity: findingsTable.severity,
      incidentTime: findingsTable.incidentTime,
      notes: findingsTable.notes,
      createdAt: findingsTable.createdAt,
    })
    .from(findingsTable)
    .leftJoin(
      violationCategoriesTable,
      eq(violationCategoriesTable.id, findingsTable.categoryId),
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
    severity: f.severity,
    incidentTime: f.incidentTime,
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
  if (!isAdminRole(req.user!.role) && i.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (i.status === "completed") {
    return res
      .status(400)
      .json({ error: "Inspection is completed and cannot accept new findings" });
  }

  const { outcome, categoryId, severity, incidentTime, notes } = parsed.data;
  if (outcome === "violation" && !categoryId) {
    return res
      .status(400)
      .json({ error: "Violations require a category" });
  }

  let categoryName: string | null = null;
  if (outcome === "violation" && categoryId) {
    const cats = await db
      .select({ name: violationCategoriesTable.name })
      .from(violationCategoriesTable)
      .where(eq(violationCategoriesTable.id, categoryId))
      .limit(1);
    categoryName = cats[0]?.name ?? null;
  }

  const now = new Date();
  const finding = await db.transaction(async (tx) => {
    const [venue] = await tx
      .update(venuesTable)
      .set({ nextClipNumber: sql`${venuesTable.nextClipNumber} + 1` })
      .where(eq(venuesTable.id, i.venueId))
      .returning();
    const clipNumber = venue.nextClipNumber - 1;
    const clipName = buildClipName(venue.code, clipNumber, now, outcome, categoryName, outcome === "violation" ? (severity ?? null) : null);
    const [created] = await tx
      .insert(findingsTable)
      .values({
        inspectionId,
        venueId: i.venueId,
        clipNumber,
        clipName,
        outcome,
        categoryId: outcome === "violation" ? categoryId ?? null : null,
        severity: outcome === "violation" ? severity ?? null : null,
        incidentTime: outcome === "violation" ? incidentTime ?? null : null,
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
      venueCode: venuesTable.code,
    })
    .from(findingsTable)
    .innerJoin(
      inspectionsTable,
      eq(inspectionsTable.id, findingsTable.inspectionId),
    )
    .innerJoin(venuesTable, eq(venuesTable.id, findingsTable.venueId))
    .where(eq(findingsTable.id, id))
    .limit(1);
  if (rows.length === 0)
    return res.status(404).json({ error: "Finding not found" });
  const { inspection, venueCode } = rows[0];
  if (!isAdminRole(req.user!.role) && inspection.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (inspection.status === "completed" && !isAdminRole(req.user!.role)) {
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
    updates.severity = null;
  } else {
    if (parsed.data.categoryId !== undefined)
      updates.categoryId = parsed.data.categoryId;
    if (parsed.data.severity !== undefined)
      updates.severity = parsed.data.severity ?? null;
    const finalCategoryId =
      updates.categoryId !== undefined ? updates.categoryId : existing.categoryId;
    const finalSeverity =
      updates.severity !== undefined ? updates.severity : existing.severity;
    if (!finalCategoryId || !finalSeverity) {
      return res.status(400).json({
        error: "Violation findings require category and severity",
      });
    }
  }
  if (parsed.data.incidentTime !== undefined) updates.incidentTime = parsed.data.incidentTime ?? null;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  // Regenerate clip_name to reflect any category/severity/outcome changes
  const finalOutcome = outcome;
  const finalCategoryId = updates.categoryId !== undefined ? updates.categoryId : existing.categoryId;
  const finalSeverity = (updates.severity !== undefined ? updates.severity : existing.severity) ?? null;
  let finalCategoryName: string | null = null;
  if (finalOutcome === "violation" && finalCategoryId) {
    const cats = await db
      .select({ name: violationCategoriesTable.name })
      .from(violationCategoriesTable)
      .where(eq(violationCategoriesTable.id, finalCategoryId))
      .limit(1);
    finalCategoryName = cats[0]?.name ?? null;
  }
  updates.clipName = buildClipName(
    venueCode,
    existing.clipNumber,
    existing.createdAt,
    finalOutcome,
    finalCategoryName,
    finalSeverity,
  );

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
  if (!isAdminRole(req.user!.role) && inspection.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (inspection.status === "completed" && !isAdminRole(req.user!.role)) {
    return res
      .status(400)
      .json({ error: "Cannot delete findings on a completed inspection" });
  }
  await db.delete(findingsTable).where(eq(findingsTable.id, id));
  res.status(204).end();
});

export default router;
