import { Router, type IRouter } from "express";
import { and, eq, asc, desc, isNull, sql, inArray, or, ilike } from "drizzle-orm";
import QRCode from "qrcode";
import {
  db,
  drivesTable,
  driveFootageWindowsTable,
  driveCustodyEventsTable,
  venuesTable,
  usersTable,
  inspectionsTable,
} from "@workspace/db";
import { requireAuth, requireMaintenance, requireAdmin } from "../middlewares/auth";
import { sendCsv } from "../lib/csv";

const router: IRouter = Router();

async function serializeDrive(driveId: number) {
  const rows = await db
    .select({
      id: drivesTable.id,
      name: drivesTable.name,
      type: drivesTable.type,
      homeVenueId: drivesTable.homeVenueId,
      homeVenueName: venuesTable.name,
      homeVenueCode: venuesTable.code,
      status: drivesTable.status,
      holderUserId: drivesTable.holderUserId,
      holderName: usersTable.name,
      notes: drivesTable.notes,
      createdAt: drivesTable.createdAt,
      updatedAt: drivesTable.updatedAt,
    })
    .from(drivesTable)
    .leftJoin(venuesTable, eq(venuesTable.id, drivesTable.homeVenueId))
    .leftJoin(usersTable, eq(usersTable.id, drivesTable.holderUserId))
    .where(eq(drivesTable.id, driveId))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  const windows = await db
    .select({
      id: driveFootageWindowsTable.id,
      driveId: driveFootageWindowsTable.driveId,
      venueId: driveFootageWindowsTable.venueId,
      venueName: venuesTable.name,
      venueCode: venuesTable.code,
      installedAt: driveFootageWindowsTable.installedAt,
      extractedAt: driveFootageWindowsTable.extractedAt,
    })
    .from(driveFootageWindowsTable)
    .innerJoin(venuesTable, eq(venuesTable.id, driveFootageWindowsTable.venueId))
    .where(eq(driveFootageWindowsTable.driveId, driveId))
    .orderBy(desc(driveFootageWindowsTable.installedAt));
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    homeVenueId: r.homeVenueId,
    homeVenueName: r.homeVenueName,
    homeVenueCode: r.homeVenueCode,
    status: r.status,
    holderUserId: r.holderUserId,
    holderName: r.holderName,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    footageWindows: windows.map((w) => ({
      id: w.id,
      driveId: w.driveId,
      venueId: w.venueId,
      venueName: w.venueName,
      venueCode: w.venueCode,
      installedAt: w.installedAt.toISOString(),
      extractedAt: w.extractedAt ? w.extractedAt.toISOString() : null,
    })),
  };
}

async function listDrives(filters: {
  type?: string;
  status?: string;
  venueId?: number;
  holderUserId?: number;
  search?: string;
  mine?: boolean;
  userId?: number;
}) {
  const conds = [];
  if (filters.type) conds.push(eq(drivesTable.type, filters.type));
  if (filters.status) conds.push(eq(drivesTable.status, filters.status));
  if (filters.venueId) conds.push(eq(drivesTable.homeVenueId, filters.venueId));
  if (filters.holderUserId) conds.push(eq(drivesTable.holderUserId, filters.holderUserId));
  if (filters.mine && filters.userId) conds.push(eq(drivesTable.holderUserId, filters.userId));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conds.push(ilike(drivesTable.name, term));
  }
  const rows = await db
    .select({
      id: drivesTable.id,
      name: drivesTable.name,
      type: drivesTable.type,
      homeVenueId: drivesTable.homeVenueId,
      homeVenueName: venuesTable.name,
      homeVenueCode: venuesTable.code,
      status: drivesTable.status,
      holderUserId: drivesTable.holderUserId,
      holderName: usersTable.name,
      createdAt: drivesTable.createdAt,
      updatedAt: drivesTable.updatedAt,
    })
    .from(drivesTable)
    .leftJoin(venuesTable, eq(venuesTable.id, drivesTable.homeVenueId))
    .leftJoin(usersTable, eq(usersTable.id, drivesTable.holderUserId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(drivesTable.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    homeVenueId: r.homeVenueId,
    homeVenueName: r.homeVenueName,
    homeVenueCode: r.homeVenueCode,
    status: r.status,
    holderUserId: r.holderUserId,
    holderName: r.holderName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

router.get("/drives", requireAuth, async (req, res) => {
  const list = await listDrives({
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    venueId: req.query.venueId ? Number(req.query.venueId) : undefined,
    holderUserId: req.query.holderUserId ? Number(req.query.holderUserId) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    mine: req.query.mine === "true",
    userId: req.user!.id,
  });
  res.json(list);
});

router.get("/drives/export.csv", requireAdmin, async (req, res) => {
  const list = await listDrives({
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    venueId: req.query.venueId ? Number(req.query.venueId) : undefined,
    holderUserId: req.query.holderUserId ? Number(req.query.holderUserId) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
  });
  // Pull windows for each drive
  const ids = list.map((d) => d.id);
  const windows = ids.length
    ? await db
        .select({
          driveId: driveFootageWindowsTable.driveId,
          venueCode: venuesTable.code,
          installedAt: driveFootageWindowsTable.installedAt,
          extractedAt: driveFootageWindowsTable.extractedAt,
        })
        .from(driveFootageWindowsTable)
        .innerJoin(venuesTable, eq(venuesTable.id, driveFootageWindowsTable.venueId))
        .where(inArray(driveFootageWindowsTable.driveId, ids))
    : [];
  const rows: unknown[][] = [];
  for (const d of list) {
    const ws = windows.filter((w) => w.driveId === d.id);
    if (ws.length === 0) {
      rows.push([d.id, d.name, d.type, d.homeVenueCode ?? "", d.status, d.holderName ?? "", "", "", ""]);
    } else {
      for (const w of ws) {
        rows.push([
          d.id,
          d.name,
          d.type,
          d.homeVenueCode ?? "",
          d.status,
          d.holderName ?? "",
          w.venueCode,
          w.installedAt.toISOString(),
          w.extractedAt ? w.extractedAt.toISOString() : "",
        ]);
      }
    }
  }
  sendCsv(res, "drives_export.csv",
    ["Drive ID", "Drive Name", "Type", "Home Venue", "Status", "Holder", "Window Venue", "Installed At", "Extracted At"],
    rows);
});

// Drive Whereabouts: depot+venue+date+time → drive holding that footage window
// IMPORTANT: must be registered BEFORE /drives/:id so it isn't matched as :id="whereabouts".
router.get("/drives/whereabouts", requireAuth, async (req, res) => {
  const venueId = Number(req.query.venueId);
  const dt = req.query.datetime ? new Date(String(req.query.datetime)) : null;
  if (!Number.isInteger(venueId) || !dt || isNaN(dt.getTime()))
    return res.status(400).json({ error: "venueId and datetime required" });
  const windows = await db
    .select({
      windowId: driveFootageWindowsTable.id,
      driveId: driveFootageWindowsTable.driveId,
      driveName: drivesTable.name,
      driveStatus: drivesTable.status,
      holderUserId: drivesTable.holderUserId,
      holderName: usersTable.name,
      installedAt: driveFootageWindowsTable.installedAt,
      extractedAt: driveFootageWindowsTable.extractedAt,
    })
    .from(driveFootageWindowsTable)
    .innerJoin(drivesTable, eq(drivesTable.id, driveFootageWindowsTable.driveId))
    .leftJoin(usersTable, eq(usersTable.id, drivesTable.holderUserId))
    .where(
      and(
        eq(driveFootageWindowsTable.venueId, venueId),
        sql`${driveFootageWindowsTable.installedAt} <= ${dt}`,
        or(
          isNull(driveFootageWindowsTable.extractedAt),
          sql`${driveFootageWindowsTable.extractedAt} >= ${dt}`,
        ),
      ),
    );
  const dateOnly = dt.toISOString().slice(0, 10);
  const inspections = await db
    .select({
      id: inspectionsTable.id,
      dvrNumber: inspectionsTable.dvrNumber,
      footageDate: inspectionsTable.footageDate,
      driveId: inspectionsTable.driveId,
    })
    .from(inspectionsTable)
    .where(and(eq(inspectionsTable.venueId, venueId), eq(inspectionsTable.footageDate, dateOnly)));
  res.json({
    matches: windows.map((w) => {
      const ageDays = (Date.now() - new Date(w.installedAt).getTime()) / (1000 * 60 * 60 * 24);
      return {
        windowId: w.windowId,
        driveId: w.driveId,
        driveName: w.driveName,
        driveStatus: w.driveStatus,
        holderUserId: w.holderUserId,
        holderName: w.holderName,
        installedAt: w.installedAt.toISOString(),
        extractedAt: w.extractedAt ? w.extractedAt.toISOString() : null,
        likelyOverwritten: ageDays > 60,
      };
    }),
    inspections: inspections.map((i) => ({
      id: i.id,
      dvrNumber: i.dvrNumber,
      footageDate: i.footageDate,
      driveId: i.driveId,
    })),
  });
});

router.get("/drives/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const d = await serializeDrive(id);
  if (!d) return res.status(404).json({ error: "Drive not found" });
  res.json(d);
});

router.get("/drives/:id/qr.png", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const drive = await db.select().from(drivesTable).where(eq(drivesTable.id, id)).limit(1);
  if (drive.length === 0) return res.status(404).json({ error: "Drive not found" });
  const payload = JSON.stringify({ kind: "drive", id, name: drive[0].name });
  const buf = await QRCode.toBuffer(payload, { type: "png", margin: 1, width: 320 });
  res.setHeader("Content-Type", "image/png");
  res.send(buf);
});

router.patch("/drives/:id", requireMaintenance, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const updates: Partial<typeof drivesTable.$inferInsert> = {};
  if (typeof req.body.status === "string") updates.status = req.body.status;
  if (typeof req.body.notes === "string" || req.body.notes === null) updates.notes = req.body.notes;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No updates" });
  updates.updatedAt = new Date();
  const [updated] = await db.update(drivesTable).set(updates).where(eq(drivesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Drive not found" });
  res.json(await serializeDrive(id));
});

// Swap drive at venue: extract one drive, install another (or just install)
router.post("/drives/swap", requireMaintenance, async (req, res) => {
  const venueId = Number(req.body.venueId);
  const installDriveId = req.body.installDriveId ? Number(req.body.installDriveId) : null;
  const extractDriveId = req.body.extractDriveId ? Number(req.body.extractDriveId) : null;
  if (!Number.isInteger(venueId)) return res.status(400).json({ error: "venueId required" });
  if (!installDriveId && !extractDriveId) return res.status(400).json({ error: "Provide at least one of installDriveId / extractDriveId" });
  try {
  await db.transaction(async (tx) => {
    const now = new Date();
    if (extractDriveId) {
      // Guard: extracted drive must currently be In DVR with an open window at this venue
      const [extDrive] = await tx.select().from(drivesTable).where(eq(drivesTable.id, extractDriveId)).limit(1);
      if (!extDrive) throw new Error("Extract drive not found");
      if (extDrive.status !== "In DVR") {
        throw new Error(`Cannot extract drive in status: ${extDrive.status}`);
      }
      const openWindows = await tx
        .select()
        .from(driveFootageWindowsTable)
        .where(
          and(
            eq(driveFootageWindowsTable.driveId, extractDriveId),
            eq(driveFootageWindowsTable.venueId, venueId),
            isNull(driveFootageWindowsTable.extractedAt),
          ),
        )
        .limit(1);
      if (openWindows.length === 0) {
        throw new Error("Extract drive has no open window at this venue");
      }
      // Close any open footage window for this drive at this venue
      await tx
        .update(driveFootageWindowsTable)
        .set({ extractedAt: now })
        .where(
          and(
            eq(driveFootageWindowsTable.driveId, extractDriveId),
            isNull(driveFootageWindowsTable.extractedAt),
          ),
        );
      await tx
        .update(drivesTable)
        .set({ status: "In Maintenance possession", holderUserId: req.user!.id, updatedAt: now })
        .where(eq(drivesTable.id, extractDriveId));
      await tx.insert(driveCustodyEventsTable).values({
        driveId: extractDriveId,
        direction: "venue_swap",
        venueId,
        fromUserId: null,
        toUserId: req.user!.id,
        releasedAt: now,
        acceptedAt: now,
      });
    }
    if (installDriveId) {
      // Guard: installed drive must currently be in maintenance possession (held by caller)
      const [insDrive] = await tx.select().from(drivesTable).where(eq(drivesTable.id, installDriveId)).limit(1);
      if (!insDrive) throw new Error("Install drive not found");
      if (insDrive.status !== "In Maintenance possession" || insDrive.holderUserId !== req.user!.id) {
        throw new Error("Install drive must be in your possession");
      }
      // Close any prior open window first (in case it was open elsewhere)
      await tx
        .update(driveFootageWindowsTable)
        .set({ extractedAt: now })
        .where(
          and(
            eq(driveFootageWindowsTable.driveId, installDriveId),
            isNull(driveFootageWindowsTable.extractedAt),
          ),
        );
      await tx.insert(driveFootageWindowsTable).values({
        driveId: installDriveId,
        venueId,
        installedAt: now,
      });
      await tx
        .update(drivesTable)
        .set({ status: "In DVR", holderUserId: null, updatedAt: now })
        .where(eq(drivesTable.id, installDriveId));
      await tx.insert(driveCustodyEventsTable).values({
        driveId: installDriveId,
        direction: "venue_swap",
        venueId,
        fromUserId: req.user!.id,
        toUserId: null,
        releasedAt: now,
        acceptedAt: now,
      });
    }
  });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "Swap failed" });
  }
  res.json({ ok: true });
});

// Maintenance direct handover with Inspector — collect or deliver in one step (no transit state)
// Must be before /drives/:id/... routes to avoid conflict
router.post("/drives/handover", requireMaintenance, async (req, res) => {
  const direction = req.body.direction;
  const driveId = Number(req.body.driveId);
  const inspectorUserId = Number(req.body.inspectorUserId);
  const confirmDriveId = typeof req.body.confirmDriveId === "number" ? req.body.confirmDriveId : null;
  const confirmDriveName = typeof req.body.confirmDriveName === "string" ? req.body.confirmDriveName.trim() : "";

  if (!["collect", "deliver"].includes(direction))
    return res.status(400).json({ error: "direction must be 'collect' or 'deliver'" });
  if (!Number.isInteger(driveId) || !Number.isInteger(inspectorUserId))
    return res.status(400).json({ error: "Invalid request" });
  if (confirmDriveId === null && !confirmDriveName)
    return res.status(400).json({ error: "Drive confirmation (scan or typed name) is required" });

  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const [d] = await tx.select().from(drivesTable).where(eq(drivesTable.id, driveId));
      if (!d) throw new Error("Drive not found");

      if (confirmDriveId !== null) {
        if (confirmDriveId !== d.id) throw new Error("Scanned drive does not match");
      } else if (confirmDriveName !== d.name) {
        throw new Error("Drive name confirmation does not match");
      }

      const [inspector] = await tx.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, inspectorUserId));
      if (!inspector) throw new Error("Inspector not found");
      if (inspector.role !== "inspector") throw new Error("Selected user is not an inspector");

      if (direction === "collect") {
        if (d.status !== "With Inspector") {
          throw new Error(`Cannot collect drive with status: ${d.status}`);
        }
        if (d.holderUserId !== inspectorUserId) {
          throw new Error("Drive is not held by the selected inspector");
        }
        await tx.update(drivesTable)
          .set({ status: "In Maintenance possession", holderUserId: req.user!.id, updatedAt: now })
          .where(eq(drivesTable.id, driveId));
        await tx.insert(driveCustodyEventsTable).values({
          driveId,
          direction: "inspector_to_maintenance",
          fromUserId: inspectorUserId,
          toUserId: req.user!.id,
          releasedAt: now,
          acceptedAt: now,
        });
      } else {
        if (d.status !== "In Maintenance possession" || d.holderUserId !== req.user!.id) {
          throw new Error("Drive must be in your possession to deliver");
        }
        await tx.update(drivesTable)
          .set({ status: "With Inspector", holderUserId: inspectorUserId, updatedAt: now })
          .where(eq(drivesTable.id, driveId));
        await tx.insert(driveCustodyEventsTable).values({
          driveId,
          direction: "maintenance_to_inspector",
          fromUserId: req.user!.id,
          toUserId: inspectorUserId,
          releasedAt: now,
          acceptedAt: now,
        });
      }
    });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "Handover failed" });
  }
  res.json({ ok: true });
});

export default router;
