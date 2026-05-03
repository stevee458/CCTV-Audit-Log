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

export const violationSubCategoriesTable = pgTable(
  "violation_sub_categories",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => violationCategoriesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    defaultSeverity: varchar("default_severity", { length: 1 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
);

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
    footageDate: date("footage_date").notNull(),
    inspectionDate: timestamp("inspection_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: varchar("status", { length: 16 }).notNull().default("in_progress"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    inspectorIdx: index("inspections_inspector_idx").on(t.inspectorId),
    venueIdx: index("inspections_venue_idx").on(t.venueId),
    depotIdx: index("inspections_depot_idx").on(t.depotId),
    statusIdx: index("inspections_status_idx").on(t.status),
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
    outcome: varchar("outcome", { length: 16 }).notNull(),
    categoryId: integer("category_id").references(
      () => violationCategoriesTable.id,
    ),
    subCategoryId: integer("sub_category_id").references(
      () => violationSubCategoriesTable.id,
    ),
    severity: varchar("severity", { length: 1 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    inspectionIdx: index("findings_inspection_idx").on(t.inspectionId),
    severityIdx: index("findings_severity_idx").on(t.severity),
    categoryIdx: index("findings_category_idx").on(t.categoryId),
    subCategoryIdx: index("findings_sub_category_idx").on(t.subCategoryId),
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

export const violationCategoriesRelations = relations(
  violationCategoriesTable,
  ({ many }) => ({
    subCategories: many(violationSubCategoriesTable),
  }),
);

export const violationSubCategoriesRelations = relations(
  violationSubCategoriesTable,
  ({ one }) => ({
    category: one(violationCategoriesTable, {
      fields: [violationSubCategoriesTable.categoryId],
      references: [violationCategoriesTable.id],
    }),
  }),
);

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
  category: one(violationCategoriesTable, {
    fields: [findingsTable.categoryId],
    references: [violationCategoriesTable.id],
  }),
  subCategory: one(violationSubCategoriesTable, {
    fields: [findingsTable.subCategoryId],
    references: [violationSubCategoriesTable.id],
  }),
}));

export type User = typeof usersTable.$inferSelect;
export type Depot = typeof depotsTable.$inferSelect;
export type Venue = typeof venuesTable.$inferSelect;
export type Inspection = typeof inspectionsTable.$inferSelect;
export type Finding = typeof findingsTable.$inferSelect;
