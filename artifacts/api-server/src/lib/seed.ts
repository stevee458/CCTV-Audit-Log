import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  depotsTable,
  venuesTable,
  violationCategoriesTable,
  violationSubCategoriesTable,
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

type CategorySeed = {
  name: string;
  subs: {
    name: string;
    description: string | null;
    severity: "A" | "B" | "C" | "D" | "E";
  }[];
};

const VIOLATION_SEED: CategorySeed[] = [
  {
    name: "Left unattended",
    subs: [
      { name: "Note period of unattendance", description: null, severity: "C" },
    ],
  },
  {
    name: "Left unsecured",
    subs: [
      {
        name: "Note the period the area was left unsecured",
        description: null,
        severity: "C",
      },
    ],
  },
  {
    name: "Security risk",
    subs: [
      {
        name: "Mobile garage door / Cash office door left open",
        description: "Mobile garage door left open / Cash office door left open",
        severity: "A",
      },
    ],
  },
  {
    name: "Arrival after start time",
    subs: [
      { name: "Post lunch / tea break", description: null, severity: "B" },
    ],
  },
  {
    name: "Leaving early",
    subs: [
      {
        name: "Lunch / tea break / end of day",
        description:
          "Lunch is taken by technical staff between 12:00 - 12:30",
        severity: "B",
      },
    ],
  },
  {
    name: "Suspicious activity",
    subs: [
      { name: "Nature of incident", description: null, severity: "A" },
    ],
  },
  {
    name: "Sleeping on duty",
    subs: [
      { name: "Note duration slept", description: null, severity: "C" },
    ],
  },
  {
    name: "Inattentive",
    subs: [
      {
        name: "Note period of inattentiveness",
        description: null,
        severity: "C",
      },
    ],
  },
  {
    name: "Suspected misuse of company resource/s",
    subs: [
      { name: "Nature of misuse", description: null, severity: "A" },
    ],
  },
  {
    name: "Fuel Spillage",
    subs: [{ name: "Note details", description: null, severity: "C" }],
  },
  {
    name: "Incident - Requiring scrutiny",
    subs: [{ name: "Nature of incident", description: null, severity: "A" }],
  },
  {
    name: "Accident",
    subs: [{ name: "Nature of accident", description: null, severity: "A" }],
  },
  {
    name: "Extended period of inactivity",
    subs: [
      { name: "Note duration of inactivity", description: null, severity: "D" },
    ],
  },
  {
    name: "Suspected theft",
    subs: [{ name: "Nature of incident", description: null, severity: "A" }],
  },
  {
    name: "Unauthorised access",
    subs: [
      {
        name: "Unknown person / driver in unauthorised area",
        description: null,
        severity: "A",
      },
    ],
  },
  {
    name: "Loitering",
    subs: [{ name: "Note duration", description: null, severity: "D" }],
  },
  {
    name: "Potential for incident",
    subs: [{ name: "Nature of risk", description: null, severity: "A" }],
  },
  {
    name: "Following company procedure",
    subs: [
      {
        name: "Bus & vehicles checks complete",
        description:
          "Paperwork submitted, pedestrian gate checks. Fuel spillage cleaned. Bus checked at the back (oil check)",
        severity: "E",
      },
    ],
  },
  {
    name: "Failure to implement company procedure",
    subs: [
      {
        name: "Metal detector / paperwork / pedestrian gate failure",
        description:
          "Metal detector not used / paperwork not submitted / pedestrian gate not used on exit / using vehicle gate to exit or enter",
        severity: "A",
      },
    ],
  },
  {
    name: "Failure to follow company procedure",
    subs: [
      {
        name: "Gate: Engine compartment not closed or bus check not complete",
        description: "Luggage compartments not checked",
        severity: "B",
      },
      {
        name: "Gate: Bus / vehicles check - clip at end of report",
        description:
          "Make clip at the end of the report noting the number of unchecked buses / vehicles",
        severity: "B",
      },
      {
        name: "Gate: Vehicles leaving with tyres",
        description:
          "Note number of tyres on exit and entry, also check corresponding dates from other depots",
        severity: "B",
      },
    ],
  },
  {
    name: "Procedure check",
    subs: [
      {
        name: "Random activity not understood",
        description:
          "Any random activity you do not understand - note it as 'Procedure check' and comment on the activity observed",
        severity: "A",
      },
    ],
  },
];

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

  // Violation taxonomy
  let order = 0;
  for (const cat of VIOLATION_SEED) {
    order += 1;
    const existing = await db
      .select()
      .from(violationCategoriesTable)
      .where(eq(violationCategoriesTable.name, cat.name))
      .limit(1);
    let categoryId: number;
    if (existing.length === 0) {
      const [created] = await db
        .insert(violationCategoriesTable)
        .values({ name: cat.name, sortOrder: order })
        .returning();
      categoryId = created.id;
    } else {
      categoryId = existing[0].id;
    }
    let subOrder = 0;
    for (const sub of cat.subs) {
      subOrder += 1;
      const existingSub = await db
        .select()
        .from(violationSubCategoriesTable)
        .where(
          sql`${violationSubCategoriesTable.categoryId} = ${categoryId} AND ${violationSubCategoriesTable.name} = ${sub.name}`,
        )
        .limit(1);
      if (existingSub.length === 0) {
        await db.insert(violationSubCategoriesTable).values({
          categoryId,
          name: sub.name,
          description: sub.description,
          defaultSeverity: sub.severity,
          sortOrder: subOrder,
        });
      }
    }
  }

  // Demo accounts
  const demoUsers = [
    {
      email: "admin@demo.local",
      name: "Demo Admin",
      role: "admin" as const,
      password: "admin123",
    },
    {
      email: "inspector@demo.local",
      name: "Demo Inspector",
      role: "inspector" as const,
      password: "inspector123",
    },
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

  logger.info("Reference data seed complete");
}
