import { Router, type IRouter } from "express";
import { and, eq, sql, gte, lte, desc } from "drizzle-orm";
import {
  db,
  inspectionsTable,
  findingsTable,
  depotsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { loadSummaries } from "./inspections";

const router: IRouter = Router();

router.get("/stats/overview", requireAdmin, async (req, res) => {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  const parsedFrom = dateFrom ? new Date(dateFrom) : undefined;
  const parsedTo = dateTo ? new Date(dateTo) : undefined;

  if (parsedFrom && isNaN(parsedFrom.getTime())) {
    return res.status(400).json({ error: "Invalid dateFrom" });
  }
  if (parsedTo && isNaN(parsedTo.getTime())) {
    return res.status(400).json({ error: "Invalid dateTo" });
  }

  const inspWhere = and(
    parsedFrom ? gte(inspectionsTable.createdAt, parsedFrom) : undefined,
    parsedTo ? lte(inspectionsTable.createdAt, parsedTo) : undefined,
  );

  const findWhere = and(
    parsedFrom ? gte(findingsTable.createdAt, parsedFrom) : undefined,
    parsedTo ? lte(findingsTable.createdAt, parsedTo) : undefined,
  );

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${inspectionsTable.status} = 'completed')::int`,
      inProgress: sql<number>`count(*) filter (where ${inspectionsTable.status} = 'in_progress')::int`,
    })
    .from(inspectionsTable)
    .where(inspWhere);

  const [findCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      violations: sql<number>`count(*) filter (where ${findingsTable.outcome} = 'violation')::int`,
    })
    .from(findingsTable)
    .where(findWhere);

  const bySeverityRows = await db
    .select({
      severity: findingsTable.severity,
      count: sql<number>`count(*)::int`,
    })
    .from(findingsTable)
    .where(and(eq(findingsTable.outcome, "violation"), findWhere))
    .groupBy(findingsTable.severity);

  const byDepotRows = await db
    .select({
      depotId: inspectionsTable.depotId,
      depotName: depotsTable.name,
      count: sql<number>`count(*)::int`,
    })
    .from(inspectionsTable)
    .innerJoin(depotsTable, eq(depotsTable.id, inspectionsTable.depotId))
    .where(inspWhere)
    .groupBy(inspectionsTable.depotId, depotsTable.name)
    .orderBy(desc(sql`count(*)`));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inspectionsTable)
    .where(gte(inspectionsTable.createdAt, sevenDaysAgo));

  res.json({
    totalInspections: counts.total,
    completedInspections: counts.completed,
    inProgressInspections: counts.inProgress,
    totalFindings: findCounts.total,
    totalViolations: findCounts.violations,
    bySeverity: bySeverityRows
      .filter((r) => r.severity)
      .map((r) => ({ severity: r.severity, count: r.count })),
    byDepot: byDepotRows.map((r) => ({
      depotId: r.depotId,
      depotName: r.depotName,
      count: r.count,
    })),
    last7DaysInspections: recent.count,
  });
});

router.get("/stats/recent", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ id: inspectionsTable.id })
    .from(inspectionsTable)
    .orderBy(desc(inspectionsTable.createdAt))
    .limit(10);
  const summaries = await loadSummaries(rows.map((r) => r.id));
  res.json(summaries);
});

export default router;
