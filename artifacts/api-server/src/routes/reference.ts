import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import {
  db,
  depotsTable,
  venuesTable,
  violationCategoriesTable,
  violationSubCategoriesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reference/depots", requireAuth, async (_req, res) => {
  const depots = await db
    .select()
    .from(depotsTable)
    .orderBy(asc(depotsTable.id));
  const venues = await db
    .select()
    .from(venuesTable)
    .orderBy(asc(venuesTable.depotId), asc(venuesTable.id));
  const grouped = depots.map((d) => ({
    id: d.id,
    name: d.name,
    venues: venues
      .filter((v) => v.depotId === d.id)
      .map((v) => ({
        id: v.id,
        name: v.name,
        code: v.code,
        cameraCount: 1,
      })),
  }));
  res.json(grouped);
});

router.get("/reference/violations", requireAuth, async (_req, res) => {
  const cats = await db
    .select()
    .from(violationCategoriesTable)
    .orderBy(asc(violationCategoriesTable.sortOrder), asc(violationCategoriesTable.id));
  const subs = await db
    .select()
    .from(violationSubCategoriesTable)
    .orderBy(
      asc(violationSubCategoriesTable.categoryId),
      asc(violationSubCategoriesTable.sortOrder),
      asc(violationSubCategoriesTable.id),
    );
  const grouped = cats.map((c) => ({
    id: c.id,
    name: c.name,
    subCategories: subs
      .filter((s) => s.categoryId === c.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        defaultSeverity: s.defaultSeverity,
      })),
  }));
  res.json(grouped);
});

export default router;
