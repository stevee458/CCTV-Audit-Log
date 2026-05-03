import type { Request, Response, NextFunction, RequestHandler } from "express";
import { randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";

export const SESSION_COOKIE = "inspection_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "inspector";
  active: boolean;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function loadUserFromSession(
  token: string,
): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      active: usersTable.active,
      createdAt: usersTable.createdAt,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(
      and(
        eq(sessionsTable.token, token),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  if (!r.active) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as "admin" | "inspector",
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

export const attachUser: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const user = await loadUserFromSession(token);
      if (user) req.user = user;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
