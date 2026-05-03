import { offlineDb, type QueuedMutation } from "./db";
import { notifyChange } from "./queue";
import { IDEMPOTENCY_HEADER } from "./headers";

export type SyncResult = {
  drained: number;
  failed: number;
};

let running = false;
let onProgress: ((mut: QueuedMutation, ok: boolean, error?: string) => void) | null = null;

export function setSyncProgressListener(fn: typeof onProgress): void {
  onProgress = fn;
}

async function sendOne(mut: QueuedMutation): Promise<{ ok: boolean; error?: string; terminal?: boolean }> {
  const headers = new Headers();
  headers.set(IDEMPOTENCY_HEADER, mut.idempotencyKey);
  if (mut.contentType) headers.set("content-type", mut.contentType);
  try {
    const res = await fetch(mut.url, {
      method: mut.method,
      headers,
      body: mut.body,
      credentials: "include",
    });
    if (res.ok) return { ok: true };
    // 4xx (except 408/425/429) are terminal client errors; 5xx, network = retry.
    if (res.status >= 400 && res.status < 500 && ![408, 425, 429].includes(res.status)) {
      let detail = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data && typeof data.error === "string") detail = data.error;
      } catch { /* ignore */ }
      return { ok: false, error: detail, terminal: true };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function runSync(): Promise<SyncResult> {
  if (running) return { drained: 0, failed: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { drained: 0, failed: 0 };
  }
  running = true;
  let drained = 0;
  let failed = 0;
  try {
    while (true) {
      const next = await offlineDb.mutations
        .where("status")
        .equals("pending")
        .sortBy("createdAt");
      if (next.length === 0) break;
      const mut = next[0];
      if (!mut.id) break;
      await offlineDb.mutations.update(mut.id, { status: "syncing", attempts: mut.attempts + 1 });
      const result = await sendOne(mut);
      if (result.ok) {
        await offlineDb.mutations.delete(mut.id);
        drained += 1;
        onProgress?.(mut, true);
      } else if (result.terminal) {
        await offlineDb.mutations.update(mut.id, {
          status: "failed",
          lastError: result.error ?? "Terminal failure",
        });
        failed += 1;
        onProgress?.(mut, false, result.error);
      } else {
        await offlineDb.mutations.update(mut.id, {
          status: "pending",
          lastError: result.error ?? "Transient failure",
        });
        // Stop draining on transient errors so we retry later.
        break;
      }
    }
  } finally {
    running = false;
    await notifyChange();
  }
  return { drained, failed };
}

export function startSyncLoop(): () => void {
  const onOnline = () => {
    void runSync();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
  }
  const interval = setInterval(() => {
    if (typeof navigator === "undefined" || navigator.onLine) {
      void runSync();
    }
  }, 15000);
  // Drain immediately if online at startup.
  if (typeof navigator === "undefined" || navigator.onLine) {
    void runSync();
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
    }
    clearInterval(interval);
  };
}
