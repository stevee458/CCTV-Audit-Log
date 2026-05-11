import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  depotsTable,
  venuesTable,
  violationCategoriesTable,
  drivesTable,
  driveFootageWindowsTable,
  assetsTable,
  stockSkusTable,
} from "@workspace/db";
import { logger } from "./logger";

type DepotSeed = {
  name: string;
  venues: { name: string; code: string }[];
};

const DEPOT_SEED: DepotSeed[] = [
  {
    name: "Soweto (Putcoton)",
    venues: [
      { name: "Main Gate", code: "P_PU01" },
      { name: "Body Shop", code: "P_PU02" },
      { name: "Stores", code: "P_PU03" },
      { name: "Tyre Bay", code: "P_PU04" },
      { name: "Fuel Bay", code: "P_PU05" },
      { name: "Cash Office", code: "P_PU06" },
    ],
  },
  {
    name: "Dobsonville (Putcoville)",
    venues: [
      { name: "Main Gate", code: "P_DO01" },
      { name: "Stores and Tyre Bay", code: "P_DO02" },
      { name: "Cash Office", code: "P_DO03" },
      { name: "Fuel Bay", code: "P_DO04" },
      { name: "External Ticket Sales Office", code: "P_DO05" },
    ],
  },
  {
    name: "Nancefield",
    venues: [
      { name: "Entrance Gate", code: "P_NA01" },
      { name: "Cash Office and Workshop", code: "P_NA02" },
      { name: "Fuel Bay", code: "P_NA03" },
    ],
  },
  {
    name: "Wynberg",
    venues: [
      { name: "Main Gate", code: "P_WY01" },
      { name: "Stores", code: "P_WY02" },
      { name: "Tyre Bay & Workshop Area", code: "P_WY03" },
    ],
  },
  {
    name: "Roseville (TAM)",
    venues: [
      { name: "Main Gate", code: "P_TAM01" },
      { name: "Management Offices Downstairs", code: "P_TAM02" },
      { name: "Management Offices Upstairs", code: "P_TAM03" },
      { name: "SetRight Offices", code: "P_TAM04" },
      { name: "Cash Office", code: "P_TAM05" },
      { name: "Cash Office Cubicles", code: "P_TAM06" },
      { name: "Secure Mobile Garage", code: "P_TAM07" },
      { name: "Tool Room 1", code: "P_TAM08" },
      { name: "Tool Room 2", code: "P_TAM09" },
      { name: "Workshop Stores", code: "P_TAM10" },
      { name: "Tyre Bay and Tool Store", code: "P_TAM11" },
    ],
  },
  {
    name: "Sandfontein",
    venues: [
      { name: "Main Gate", code: "P_SA01" },
      { name: "Cash Office", code: "P_SA02" },
      { name: "Workshop Offices", code: "P_SA03" },
      { name: "Main Stores", code: "P_SA04" },
      { name: "Tyre Bay", code: "P_SA05" },
    ],
  },
  {
    name: "Soshanguve",
    venues: [
      { name: "Entrance Gate", code: "P_SO01" },
      { name: "Revenue Office", code: "P_SO02" },
      { name: "Fuel Bay", code: "P_SO03" },
      { name: "Depot Stores", code: "P_SO04" },
    ],
  },
  {
    name: "Ekandustria",
    venues: [
      { name: "Main Gate", code: "P_EK01" },
      { name: "Cashier Cubicles", code: "P_EK02" },
      { name: "Fuel Bay", code: "P_EK03" },
      { name: "Stores", code: "P_EK04" },
    ],
  },
];

const VIOLATION_SEED: string[] = [
  "Left unattended",
  "Left unsecured",
  "Security risk",
  "Arrival after start time",
  "Leaving early",
  "Suspicious activity",
  "Sleeping on duty",
  "Inattentive",
  "Suspected misuse of company resource/s",
  "Fuel Spillage",
  "Incident - Requiring scrutiny",
  "Accident",
  "Extended period of inactivity",
  "Suspected theft",
  "Unauthorised access",
  "Loitering",
  "Potential for incident",
  "Following company procedure",
  "Failure to implement company procedure",
  "Failure to follow company procedure",
  "Procedure check",
];

const ASSET_TYPES = ["DVR", "Camera", "Power Supply", "Hard Drive", "Cable"] as const;

export async function seedReferenceData(): Promise<void> {
  // Depots and venues
  for (const depotSeed of DEPOT_SEED) {
    const existing = await db
      .select()
      .from(depotsTable)
      .where(eq(depotsTable.name, depotSeed.name))
      .limit(1);
    let depotId: number;
    if (existing.length === 0) {
      const [created] = await db
        .insert(depotsTable)
        .values({ name: depotSeed.name })
        .returning();
      depotId = created.id;
    } else {
      depotId = existing[0].id;
    }
    for (const venue of depotSeed.venues) {
      const v = await db
        .select()
        .from(venuesTable)
        .where(eq(venuesTable.code, venue.code))
        .limit(1);
      if (v.length === 0) {
        await db.insert(venuesTable).values({
          depotId,
          name: venue.name,
          code: venue.code,
        });
      }
    }
  }

  // Violation categories
  let order = 0;
  for (const name of VIOLATION_SEED) {
    order += 1;
    const existing = await db
      .select()
      .from(violationCategoriesTable)
      .where(eq(violationCategoriesTable.name, name))
      .limit(1);
    if (existing.length === 0) {
      await db
        .insert(violationCategoriesTable)
        .values({ name, sortOrder: order });
    }
  }

  // Demo accounts
  const demoUsers = [
    { email: "admin@demo.local", name: "Demo Admin", role: "admin" as const, password: "admin123" },
    { email: "inspector@demo.local", name: "Demo Inspector", role: "inspector" as const, password: "inspector123" },
    { email: "maintenance@demo.local", name: "Demo Maintenance", role: "maintenance" as const, password: "maintenance123" },
  ];
  for (const u of demoUsers) {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, u.email))
      .limit(1);
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await db.insert(usersTable).values({
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        active: true,
      });
    }
  }

  // Get the maintenance user id (for drive holders / inspector pool)
  const maintenanceUser = (
    await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "maintenance@demo.local"))
      .limit(1)
  )[0];

  // Drives — two venue drives per venue, 4 inspector drives held by Maintenance
  const allVenues = await db.select().from(venuesTable);
  for (const venue of allVenues) {
    for (const suffix of ["A", "B"] as const) {
      const driveName = `${venue.code}-${suffix}`;
      const existing = await db
        .select()
        .from(drivesTable)
        .where(eq(drivesTable.name, driveName))
        .limit(1);
      if (existing.length === 0) {
        // First drive (A) is "In DVR" with a baseline footage window installed today
        const isInstalled = suffix === "A";
        const [drive] = await db
          .insert(drivesTable)
          .values({
            name: driveName,
            type: "venue",
            homeVenueId: venue.id,
            status: isInstalled ? "In DVR" : "In Maintenance possession",
            holderUserId: isInstalled ? null : maintenanceUser?.id ?? null,
          })
          .returning();
        if (isInstalled) {
          // Baseline window starting 7 days ago
          await db.insert(driveFootageWindowsTable).values({
            driveId: drive.id,
            venueId: venue.id,
            installedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }
  }

  for (let i = 1; i <= 4; i += 1) {
    const driveName = `INSP-${String(i).padStart(2, "0")}`;
    const existing = await db
      .select()
      .from(drivesTable)
      .where(eq(drivesTable.name, driveName))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(drivesTable).values({
        name: driveName,
        type: "inspector",
        status: "In Maintenance possession",
        holderUserId: maintenanceUser?.id ?? null,
      });
    }
  }

  // Assets — 2 of each type per venue
  for (const venue of allVenues) {
    const existing = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.venueId, venue.id))
      .limit(1);
    if (existing.length === 0) {
      for (const type of ASSET_TYPES) {
        for (let n = 1; n <= 2; n += 1) {
          await db.insert(assetsTable).values({
            venueId: venue.id,
            type,
            label: `${venue.code} ${type} #${n}`,
            status: "Operational",
          });
        }
      }
    }
  }

  // Stock — 2 items of each type + 2 accessories
  const STOCK_SEED = [
    ...ASSET_TYPES.flatMap((cat) => [
      { name: `${cat} (spare unit A)`, kind: "item" as const, category: cat, description: null, onHand: 2 },
      { name: `${cat} (spare unit B)`, kind: "item" as const, category: cat, description: null, onHand: 1 },
    ]),
    { name: "BNC Connector", kind: "accessory" as const, category: "Connector", description: "BNC connector, pack of 20", onHand: 50 },
    { name: "RJ45 Connector", kind: "accessory" as const, category: "Connector", description: "RJ45 crimp connector, pack of 100", onHand: 200 },
  ];
  for (const s of STOCK_SEED) {
    const existing = await db
      .select()
      .from(stockSkusTable)
      .where(eq(stockSkusTable.name, s.name))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(stockSkusTable).values(s);
    }
  }

  logger.info("Reference data seed complete");
}
