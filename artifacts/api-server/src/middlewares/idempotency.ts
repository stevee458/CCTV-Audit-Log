import type { RequestHandler } from "express";
import { createHash } from "crypto";
import { eq, and, sql, lt } from "drizzle-orm";
import { db, idempotencyKeysTable } from "@workspace/db";

function hashRequest(method: string, path: string, body: unknown): string {
  const h = createHash("sha256");
  h.update(method);
  h.update("\n");
  h.update(path);
  h.update("\n");
  h.update(body == null ? "" : JSON.stringify(body));
  return h.digest("hex");
}

export const IDEMPOTENCY_HEADER = "idempotency-key";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      _idemKey?: string;
      _idemUserId?: number;
    }
  }
}

export const withIdempotency: RequestHandler = async (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  const key = req.header(IDEMPOTENCY_HEADER);
  if (!key || !req.user) return next();
  const userId = req.user.id;
  const requestHash = hashRequest(req.method, req.path, req.body);

  try {
    // Atomically claim the key. If another request already inserted it, this
    // returns no rows; otherwise we own the row and proceed to execute.
    const claimed = await db
      .insert(idempotencyKeysTable)
      .values({
        userId,
        key,
        method: req.method,
        path: req.path,
        requestHash,
        status: null as unknown as number,
        response: null,
      })
      .onConflictDoNothing({
        target: [idempotencyKeysTable.userId, idempotencyKeysTable.key],
      })
      .returning({ key: idempotencyKeysTable.key });

    if (claimed.length === 0) {
      // Already exists — this is a replay. Wait briefly for the original to
      // finish if it is still in-flight (status IS NULL), then return cached.
      const deadline = Date.now() + 10_000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const [existing] = await db
          .select()
          .from(idempotencyKeysTable)
          .where(
            and(
              eq(idempotencyKeysTable.userId, userId),
              eq(idempotencyKeysTable.key, key),
            ),
          )
          .limit(1);
        if (!existing) {
          // The original was rolled back; treat key as fresh on next attempt.
          res.status(409).json({ error: "Idempotency key in invalid state, please retry" });
          return;
        }
        if (
          existing.method !== req.method ||
          existing.path !== req.path ||
          existing.requestHash !== requestHash
        ) {
          res
            .status(409)
            .json({ error: "Idempotency key reuse with a different request" });
          return;
        }
        if (existing.status !== null && existing.status !== undefined) {
          res.status(existing.status);
          if (existing.response) {
            res.setHeader("content-type", "application/json");
            res.send(existing.response);
          } else {
            res.end();
          }
          return;
        }
        if (Date.now() > deadline) {
          res
            .status(409)
            .json({ error: "Idempotent request still in progress, please retry" });
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  } catch (err) {
    return next(err);
  }

  res._idemKey = key;
  res._idemUserId = userId;

  // Capture the response body so we can persist it on completion.
  const origJson = res.json.bind(res);
  const origSend = res.send.bind(res);
  let captured: string | null = null;

  res.json = ((body: unknown) => {
    captured = JSON.stringify(body);
    return origJson(body);
  }) as typeof res.json;

  res.send = ((body: unknown) => {
    if (typeof body === "string") captured = body;
    else if (body !== undefined && body !== null) captured = JSON.stringify(body);
    return origSend(body);
  }) as typeof res.send;

  res.on("finish", () => {
    if (!res._idemKey || res._idemUserId === undefined) return;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Success: persist the cached response for future replays.
      db.update(idempotencyKeysTable)
        .set({ status: res.statusCode, response: captured })
        .where(
          and(
            eq(idempotencyKeysTable.userId, res._idemUserId),
            eq(idempotencyKeysTable.key, res._idemKey),
          ),
        )
        .catch(() => {});
    } else {
      // Failure: release the claim so the client can retry the same key.
      db.delete(idempotencyKeysTable)
        .where(
          and(
            eq(idempotencyKeysTable.userId, res._idemUserId),
            eq(idempotencyKeysTable.key, res._idemKey),
            sql`${idempotencyKeysTable.status} IS NULL`,
          ),
        )
        .catch(() => {});
    }
  });

  res.on("close", () => {
    // Connection dropped before finish — release the claim.
    if (res.writableEnded) return;
    if (!res._idemKey || res._idemUserId === undefined) return;
    db.delete(idempotencyKeysTable)
      .where(
        and(
          eq(idempotencyKeysTable.userId, res._idemUserId),
          eq(idempotencyKeysTable.key, res._idemKey),
          sql`${idempotencyKeysTable.status} IS NULL`,
        ),
      )
      .catch(() => {});
  });

  next();
};

/**
 * Delete idempotency keys older than the given number of days.
 * Safe to run at any time — in-flight keys (status IS NULL) that are
 * genuinely old are stale and can be removed too.
 */
export async function pruneIdempotencyKeys(olderThanDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(idempotencyKeysTable)
    .where(lt(idempotencyKeysTable.createdAt, cutoff))
    .returning({ key: idempotencyKeysTable.key });
  return deleted.length;
}
