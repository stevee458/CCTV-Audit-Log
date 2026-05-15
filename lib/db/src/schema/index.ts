import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  date,
  uniqueIndex,
  varchar,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: varchar("role", { length: 16 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

export const sessionsTable = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const depotsTable = pgTable("depots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const venuesTable = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    depotId: integer("depot_id")
      .notNull()
      .references(() => depotsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    nextClipNumber: integer("next_clip_number").notNull().default(1),
  },
  (t) => ({
    codeUnique: uniqueIndex("venues_code_unique").on(t.code),
  }),
);

export const violationCategoriesTable = pgTable("violation_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Drives ───────────────────────────────────────────────────────────────
export const drivesTable = pgTable(
  "drives",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: varchar("type", { length: 16 }).notNull(), // 'venue' | 'inspector'
    homeVenueId: integer("home_venue_id").references(() => venuesTable.id),
    status: varchar("status", { length: 32 }).notNull().default("In Maintenance possession"),
    holderUserId: integer("holder_user_id").references(() => usersTable.id),
    notes: text("notes"),
    installedAt: date("installed_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameUnique: uniqueIndex("drives_name_unique").on(t.name),
    statusIdx: index("drives_status_idx").on(t.status),
  }),
);

export const driveFootageWindowsTable = pgTable(
  "drive_footage_windows",
  {
    id: serial("id").primaryKey(),
    driveId: integer("drive_id")
      .notNull()
      .references(() => drivesTable.id, { onDelete: "cascade" }),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venuesTable.id),
    installedAt: timestamp("installed_at", { withTimezone: true }).notNull(),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
  },
  (t) => ({
    driveIdx: index("dfw_drive_idx").on(t.driveId),
    venueIdx: index("dfw_venue_idx").on(t.venueId),
  }),
);

export const driveCustodyEventsTable = pgTable(
  "drive_custody_events",
  {
    id: serial("id").primaryKey(),
    driveId: integer("drive_id")
      .notNull()
      .references(() => drivesTable.id, { onDelete: "cascade" }),
    fromUserId: integer("from_user_id").references(() => usersTable.id),
    toUserId: integer("to_user_id").references(() => usersTable.id),
    direction: varchar("direction", { length: 32 }).notNull(), // 'maintenance_to_inspector' | 'inspector_to_maintenance' | 'venue_swap'
    releasedAt: timestamp("released_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    venueId: integer("venue_id").references(() => venuesTable.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    driveIdx: index("dce_drive_idx").on(t.driveId),
  }),
);

// ─── Assets ───────────────────────────────────────────────────────────────
export const assetsTable = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venuesTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(), // DVR, Camera, Power Supply, Hard Drive, Cable
    label: text("label").notNull(),
    serial: text("serial"),
    installedAt: date("installed_at"),
    status: varchar("status", { length: 16 }).notNull().default("Operational"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    venueIdx: index("assets_venue_idx").on(t.venueId),
  }),
);

// ─── Stock ────────────────────────────────────────────────────────────────
export const stockSkusTable = pgTable(
  "stock_skus",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    kind: varchar("kind", { length: 16 }).notNull(), // 'item' | 'accessory'
    category: varchar("category", { length: 32 }), // DVR, Camera, ... or 'Connector', 'Other'
    description: text("description"),
    onHand: integer("on_hand").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const stockRequestsTable = pgTable("stock_requests", {
  id: serial("id").primaryKey(),
  skuId: integer("sku_id")
    .notNull()
    .references(() => stockSkusTable.id),
  requestedBy: integer("requested_by")
    .notNull()
    .references(() => usersTable.id),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 16 }).notNull().default("Requested"),
  // 'Requested' | 'Ordered' | 'Collected' | 'Rejected'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stockPurchasesTable = pgTable("stock_purchases", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => stockRequestsTable.id),
  skuId: integer("sku_id")
    .notNull()
    .references(() => stockSkusTable.id),
  quantity: integer("quantity").notNull(),
  unitCost: integer("unit_cost_cents").notNull(),
  totalCost: integer("total_cost_cents").notNull(),
  supplier: text("supplier"),
  poRef: text("po_ref"),
  expectedAt: date("expected_at"),
  collectedAt: timestamp("collected_at", { withTimezone: true }),
  recordedBy: integer("recorded_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  skuId: integer("sku_id")
    .notNull()
    .references(() => stockSkusTable.id),
  changeQty: integer("change_qty").notNull(), // positive or negative
  reason: varchar("reason", { length: 32 }).notNull(),
  // 'collection' | 'consumption' | 'adjustment'
  notes: text("notes"),
  refTable: varchar("ref_table", { length: 32 }),
  refId: integer("ref_id"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Maintenance visits ───────────────────────────────────────────────────
export const maintenanceVisitsTable = pgTable("maintenance_visits", {
  id: serial("id").primaryKey(),
  maintainerId: integer("maintainer_id")
    .notNull()
    .references(() => usersTable.id),
  depotId: integer("depot_id")
    .notNull()
    .references(() => depotsTable.id),
  visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const venueInspectionVisitsTable = pgTable("venue_inspection_visits", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id")
    .notNull()
    .references(() => maintenanceVisitsTable.id, { onDelete: "cascade" }),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venuesTable.id),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
});

export const repairEventsTable = pgTable("repair_events", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => maintenanceVisitsTable.id, {
    onDelete: "cascade",
  }),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venuesTable.id),
  assetId: integer("asset_id").references(() => assetsTable.id),
  action: varchar("action", { length: 16 }).notNull(), // 'repair' | 'replace'
  description: text("description"),
  partsCostCents: integer("parts_cost_cents").notNull().default(0),
  labourCostCents: integer("labour_cost_cents").notNull().default(0),
  clientChargeCents: integer("client_charge_cents").notNull().default(0),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id),
});

export const repairConsumptionTable = pgTable("repair_consumption", {
  id: serial("id").primaryKey(),
  repairId: integer("repair_id")
    .notNull()
    .references(() => repairEventsTable.id, { onDelete: "cascade" }),
  skuId: integer("sku_id")
    .notNull()
    .references(() => stockSkusTable.id),
  quantity: integer("quantity").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
});

// ─── Inspections (extended with driveId) ──────────────────────────────────
export const inspectionsTable = pgTable(
  "inspections",
  {
    id: serial("id").primaryKey(),
    inspectorId: integer("inspector_id")
      .notNull()
      .references(() => usersTable.id),
    dvrNumber: text("dvr_number").notNull(),
    depotId: integer("depot_id")
      .notNull()
      .references(() => depotsTable.id),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venuesTable.id),
    driveId: integer("drive_id").references(() => drivesTable.id),
    footageDate: date("footage_date").notNull(),
    inspectionDate: timestamp("inspection_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: varchar("status", { length: 16 }).notNull().default("in_progress"),
    notes: text("notes"),
    clientId: text("client_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    inspectorIdx: index("inspections_inspector_idx").on(t.inspectorId),
    venueIdx: index("inspections_venue_idx").on(t.venueId),
    depotIdx: index("inspections_depot_idx").on(t.depotId),
    statusIdx: index("inspections_status_idx").on(t.status),
    driveIdx: index("inspections_drive_idx").on(t.driveId),
  }),
);

export const findingsTable = pgTable(
  "findings",
  {
    id: serial("id").primaryKey(),
    inspectionId: integer("inspection_id")
      .notNull()
      .references(() => inspectionsTable.id, { onDelete: "cascade" }),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venuesTable.id),
    clipNumber: integer("clip_number").notNull(),
    clipName: text("clip_name").notNull(),
    outcome: varchar("outcome", { length: 32 }).notNull(),
    categoryId: integer("category_id").references(
      () => violationCategoriesTable.id,
    ),
    severity: varchar("severity", { length: 1 }),
    notes: text("notes"),
    incidentTime: text("incident_time"),
    clientId: text("client_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedById: integer("resolved_by_id").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    inspectionIdx: index("findings_inspection_idx").on(t.inspectionId),
    severityIdx: index("findings_severity_idx").on(t.severity),
    categoryIdx: index("findings_category_idx").on(t.categoryId),
  }),
);

export const usersRelations = relations(usersTable, ({ many }) => ({
  inspections: many(inspectionsTable),
}));

export const depotsRelations = relations(depotsTable, ({ many }) => ({
  venues: many(venuesTable),
}));

export const venuesRelations = relations(venuesTable, ({ one, many }) => ({
  depot: one(depotsTable, {
    fields: [venuesTable.depotId],
    references: [depotsTable.id],
  }),
  inspections: many(inspectionsTable),
}));

export const inspectionsRelations = relations(
  inspectionsTable,
  ({ one, many }) => ({
    inspector: one(usersTable, {
      fields: [inspectionsTable.inspectorId],
      references: [usersTable.id],
    }),
    depot: one(depotsTable, {
      fields: [inspectionsTable.depotId],
      references: [depotsTable.id],
    }),
    venue: one(venuesTable, {
      fields: [inspectionsTable.venueId],
      references: [venuesTable.id],
    }),
    drive: one(drivesTable, {
      fields: [inspectionsTable.driveId],
      references: [drivesTable.id],
    }),
    findings: many(findingsTable),
  }),
);

export const findingsRelations = relations(findingsTable, ({ one }) => ({
  inspection: one(inspectionsTable, {
    fields: [findingsTable.inspectionId],
    references: [inspectionsTable.id],
  }),
  venue: one(venuesTable, {
    fields: [findingsTable.venueId],
    references: [venuesTable.id],
  }),
}));

export const idempotencyKeysTable = pgTable(
  "idempotency_keys",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    requestHash: text("request_hash").notNull(),
    status: integer("status"),
    response: text("response"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type Depot = typeof depotsTable.$inferSelect;
export type Venue = typeof venuesTable.$inferSelect;
export type Inspection = typeof inspectionsTable.$inferSelect;
export type Finding = typeof findingsTable.$inferSelect;
export type Drive = typeof drivesTable.$inferSelect;
export type Asset = typeof assetsTable.$inferSelect;
export type StockSku = typeof stockSkusTable.$inferSelect;
