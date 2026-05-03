import { Router, type IRouter } from "express";
import { and, eq, gte, lte, desc, sql, inArray, ilike, or } from "drizzle-orm";
import {
  db,
  inspectionsTable,
  findingsTable,
  depotsTable,
  venuesTable,
  usersTable,
  violationCategoriesTable,
  violationSubCategoriesTable,
} from "@workspace/db";
import {
  CreateInspectionBody,
  UpdateInspectionBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const SEVERITY_RANK: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

async function loadSummaries(inspectionIds: number[]) {
  if (inspectionIds.length === 0) return [];
  const rows = await db
    .select({
      id: inspectionsTable.id,
      dvrNumber: inspectionsTable.dvrNumber,
      depotId: inspectionsTable.depotId,
      depotName: depotsTable.name,
      venueId: inspectionsTable.venueId,
      venueName: venuesTable.name,
      venueCode: venuesTable.code,
      footageDate: inspectionsTable.footageDate,
      inspectionDate: inspectionsTable.inspectionDate,
      inspectorId: inspectionsTable.inspectorId,
      inspectorName: usersTable.name,
      status: inspectionsTable.status,
      createdAt: inspectionsTable.createdAt,
      completedAt: inspectionsTable.completedAt,
    })
    .from(inspectionsTable)
    .innerJoin(depotsTable, eq(depotsTable.id, inspectionsTable.depotId))
    .innerJoin(venuesTable, eq(venuesTable.id, inspectionsTable.venueId))
    .innerJoin(usersTable, eq(usersTable.id, inspectionsTable.inspectorId))
    .where(inArray(inspectionsTable.id, inspectionIds));

  const findings = await db
    .select()
    .from(findingsTable)
    .where(inArray(findingsTable.inspectionId, inspectionIds));

  return rows
    .map((r) => {
      const fs = findings.filter((f) => f.inspectionId === r.id);
      const violations = fs.filter((f) => f.outcome === "violation");
      let highest: string | null = null;
      for (const v of violations) {
        if (!v.severity) continue;
        if (!highest || SEVERITY_RANK[v.severity] > SEVERITY_RANK[highest]) {
          highest = v.severity;
        }
      }
      return {
        id: r.id,
        dvrNumber: r.dvrNumber,
        depotId: r.depotId,
        depotName: r.depotName,
        venueId: r.venueId,
        venueName: r.venueName,
        venueCode: r.venueCode,
        footageDate: r.footageDate,
        inspectionDate: r.inspectionDate.toISOString(),
        inspectorId: r.inspectorId,
        inspectorName: r.inspectorName,
        status: r.status,
        findingsCount: fs.length,
        violationsCount: violations.length,
        highestSeverity: highest,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function listInspectionIds(req: any): Promise<number[] | null> {
  const q = req.query;
  const conds = [] as ReturnType<typeof eq>[];
  if (q.depotId) conds.push(eq(inspectionsTable.depotId, Number(q.depotId)));
  if (q.venueId) conds.push(eq(inspectionsTable.venueId, Number(q.venueId)));
  if (q.inspectorId)
    conds.push(eq(inspectionsTable.inspectorId, Number(q.inspectorId)));
  if (q.status && q.status !== "all")
    conds.push(eq(inspectionsTable.status, String(q.status)));
  if (q.footageDateFrom)
    conds.push(gte(inspectionsTable.footageDate, String(q.footageDateFrom)));
  if (q.footageDateTo)
    conds.push(lte(inspectionsTable.footageDate, String(q.footageDateTo)));
  if (q.inspectionDateFrom)
    conds.push(
      gte(inspectionsTable.inspectionDate, new Date(String(q.inspectionDateFrom))),
    );
  if (q.inspectionDateTo)
    conds.push(
      lte(inspectionsTable.inspectionDate, new Date(String(q.inspectionDateTo))),
    );
  if (q.mine === "true" && req.user) {
    conds.push(eq(inspectionsTable.inspectorId, req.user.id));
  }
  // Inspectors are restricted to their own inspections regardless of `mine`
  if (req.user && req.user.role !== "admin") {
    conds.push(eq(inspectionsTable.inspectorId, req.user.id));
  }

  let candidateIds: number[] | null = null;

  if (q.outcome === "violation" || q.outcome === "no_violation") {
    const fconds = [eq(findingsTable.outcome, String(q.outcome))];
    if (q.categoryId)
      fconds.push(eq(findingsTable.categoryId, Number(q.categoryId)));
    if (q.subCategoryId)
      fconds.push(eq(findingsTable.subCategoryId, Number(q.subCategoryId)));
    if (q.severity) fconds.push(eq(findingsTable.severity, String(q.severity)));
    const matches = await db
      .selectDistinct({ id: findingsTable.inspectionId })
      .from(findingsTable)
      .where(and(...fconds));
    candidateIds = matches.map((m) => m.id);
    if (candidateIds.length === 0) return [];
  } else if (q.categoryId || q.subCategoryId || q.severity) {
    const fconds = [];
    if (q.categoryId)
      fconds.push(eq(findingsTable.categoryId, Number(q.categoryId)));
    if (q.subCategoryId)
      fconds.push(eq(findingsTable.subCategoryId, Number(q.subCategoryId)));
    if (q.severity) fconds.push(eq(findingsTable.severity, String(q.severity)));
    const matches = await db
      .selectDistinct({ id: findingsTable.inspectionId })
      .from(findingsTable)
      .where(and(...fconds));
    candidateIds = matches.map((m) => m.id);
    if (candidateIds.length === 0) return [];
  }

  if (candidateIds) conds.push(inArray(inspectionsTable.id, candidateIds));

  let baseQuery = db
    .select({ id: inspectionsTable.id, dvr: inspectionsTable.dvrNumber })
    .from(inspectionsTable)
    .innerJoin(venuesTable, eq(venuesTable.id, inspectionsTable.venueId))
    .innerJoin(usersTable, eq(usersTable.id, inspectionsTable.inspectorId));

  if (q.search) {
    const term = `%${String(q.search)}%`;
    const noteMatches = await db
      .selectDistinct({ id: findingsTable.inspectionId })
      .from(findingsTable)
      .where(ilike(findingsTable.notes, term));
    const noteInspectionIds = noteMatches.map((m) => m.id);
    conds.push(
      // Search across DVR, venue code/name, inspector name, inspection notes, finding notes
      // @ts-expect-error mixing ilike or
      or(
        ilike(inspectionsTable.dvrNumber, term),
        ilike(venuesTable.code, term),
        ilike(venuesTable.name, term),
        ilike(usersTable.name, term),
        ilike(inspectionsTable.notes, term),
        noteInspectionIds.length > 0
          ? inArray(inspectionsTable.id, noteInspectionIds)
          : sql`false`,
      ),
    );
  }

  const rows = await baseQuery
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(inspectionsTable.createdAt));

  return rows.map((r) => r.id);
}

router.get("/inspections", requireAuth, async (req, res) => {
  const ids = await listInspectionIds(req);
  if (!ids) return res.json([]);
  res.json(await loadSummaries(ids));
});

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get("/inspections/export.csv", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const ids = (await listInspectionIds(req)) ?? [];
  if (ids.length === 0) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inspections_export.csv"`,
    );
    return res.send("\uFEFF");
  }
  const fulls = await Promise.all(ids.map((id) => loadFullInspection(id)));
  const headers = [
    "Inspection ID",
    "DVR Number",
    "Depot",
    "Venue Name",
    "Venue Code",
    "Footage Date",
    "Inspection Date",
    "Inspector",
    "Status",
    "Completed At",
    "Inspection Notes",
    "Clip Name",
    "Outcome",
    "Category",
    "Sub Category",
    "Severity",
    "Finding Notes",
    "Finding Created At",
  ];
  const lines: string[] = [headers.map(csvCell).join(",")];
  for (const f of fulls) {
    if (!f) continue;
    if (f.findings.length === 0) {
      lines.push(
        [
          f.id,
          f.dvrNumber,
          f.depotName,
          f.venueName,
          f.venueCode,
          f.footageDate,
          f.inspectionDate,
          f.inspectorName,
          f.status,
          f.completedAt ?? "",
          f.notes ?? "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]
          .map(csvCell)
          .join(","),
      );
      continue;
    }
    for (const fnd of f.findings) {
      lines.push(
        [
          f.id,
          f.dvrNumber,
          f.depotName,
          f.venueName,
          f.venueCode,
          f.footageDate,
          f.inspectionDate,
          f.inspectorName,
          f.status,
          f.completedAt ?? "",
          f.notes ?? "",
          fnd.clipName,
          fnd.outcome,
          fnd.categoryName ?? "",
          fnd.subCategoryName ?? "",
          fnd.severity ?? "",
          fnd.notes ?? "",
          fnd.createdAt,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="inspections_export.csv"`,
  );
  res.send("\uFEFF" + lines.join("\n"));
});

async function loadFullInspection(id: number) {
  const rows = await db
    .select({
      id: inspectionsTable.id,
      dvrNumber: inspectionsTable.dvrNumber,
      depotId: inspectionsTable.depotId,
      depotName: depotsTable.name,
      venueId: inspectionsTable.venueId,
      venueName: venuesTable.name,
      venueCode: venuesTable.code,
      footageDate: inspectionsTable.footageDate,
      inspectionDate: inspectionsTable.inspectionDate,
      inspectorId: inspectionsTable.inspectorId,
      inspectorName: usersTable.name,
      status: inspectionsTable.status,
      notes: inspectionsTable.notes,
      createdAt: inspectionsTable.createdAt,
      completedAt: inspectionsTable.completedAt,
    })
    .from(inspectionsTable)
    .innerJoin(depotsTable, eq(depotsTable.id, inspectionsTable.depotId))
    .innerJoin(venuesTable, eq(venuesTable.id, inspectionsTable.venueId))
    .innerJoin(usersTable, eq(usersTable.id, inspectionsTable.inspectorId))
    .where(eq(inspectionsTable.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const insp = rows[0];

  const findings = await db
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
    .where(eq(findingsTable.inspectionId, id))
    .orderBy(findingsTable.id);

  return {
    id: insp.id,
    dvrNumber: insp.dvrNumber,
    depotId: insp.depotId,
    depotName: insp.depotName,
    venueId: insp.venueId,
    venueName: insp.venueName,
    venueCode: insp.venueCode,
    footageDate: insp.footageDate,
    inspectionDate: insp.inspectionDate.toISOString(),
    inspectorId: insp.inspectorId,
    inspectorName: insp.inspectorName,
    status: insp.status,
    notes: insp.notes,
    findings: findings.map((f) => ({
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
    })),
    createdAt: insp.createdAt.toISOString(),
    completedAt: insp.completedAt ? insp.completedAt.toISOString() : null,
  };
}

router.post("/inspections", requireAuth, async (req, res) => {
  const parsed = CreateInspectionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const { dvrNumber, depotId, venueId, footageDate, inspectionDate, notes } =
    parsed.data;
  const venue = await db
    .select()
    .from(venuesTable)
    .where(eq(venuesTable.id, venueId))
    .limit(1);
  if (venue.length === 0 || venue[0].depotId !== depotId) {
    return res.status(400).json({ error: "Venue does not belong to depot" });
  }
  const [created] = await db
    .insert(inspectionsTable)
    .values({
      inspectorId: req.user!.id,
      dvrNumber: dvrNumber.trim(),
      depotId,
      venueId,
      footageDate,
      inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
      notes: notes ?? null,
    })
    .returning();
  const full = await loadFullInspection(created.id);
  res.status(201).json(full);
});

router.get("/inspections/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const full = await loadFullInspection(id);
  if (!full) return res.status(404).json({ error: "Inspection not found" });
  if (req.user!.role !== "admin" && full.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(full);
});

router.patch("/inspections/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateInspectionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const existing = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.id, id))
    .limit(1);
  if (existing.length === 0)
    return res.status(404).json({ error: "Inspection not found" });
  const e = existing[0];
  if (req.user!.role !== "admin" && e.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const updates: Partial<typeof inspectionsTable.$inferInsert> = {};
  if (parsed.data.dvrNumber !== undefined)
    updates.dvrNumber = parsed.data.dvrNumber.trim();
  if (parsed.data.depotId !== undefined) updates.depotId = parsed.data.depotId;
  if (parsed.data.venueId !== undefined) updates.venueId = parsed.data.venueId;
  const finalDepotId = updates.depotId ?? e.depotId;
  const finalVenueId = updates.venueId ?? e.venueId;
  if (parsed.data.depotId !== undefined || parsed.data.venueId !== undefined) {
    const venueRow = await db
      .select()
      .from(venuesTable)
      .where(eq(venuesTable.id, finalVenueId))
      .limit(1);
    if (venueRow.length === 0 || venueRow[0].depotId !== finalDepotId) {
      return res.status(400).json({ error: "Venue does not belong to depot" });
    }
  }
  if (parsed.data.footageDate !== undefined)
    updates.footageDate = parsed.data.footageDate;
  if (parsed.data.inspectionDate !== undefined)
    updates.inspectionDate = new Date(parsed.data.inspectionDate);
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (Object.keys(updates).length > 0) {
    await db
      .update(inspectionsTable)
      .set(updates)
      .where(eq(inspectionsTable.id, id));
  }
  const full = await loadFullInspection(id);
  res.json(full);
});

router.post("/inspections/:id/complete", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const existing = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.id, id))
    .limit(1);
  if (existing.length === 0)
    return res.status(404).json({ error: "Inspection not found" });
  const e = existing[0];
  if (req.user!.role !== "admin" && e.inspectorId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  await db
    .update(inspectionsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(inspectionsTable.id, id));
  const full = await loadFullInspection(id);
  res.json(full);
});

export { loadFullInspection, loadSummaries };
export default router;
