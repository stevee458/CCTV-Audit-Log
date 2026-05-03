import { offlineDb } from "./db";
import { clearPersistedQueryCache } from "./persister";

const SCOPE_KEY = "inspection-app-scope-v1";

export function getStoredScope(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage.getItem(SCOPE_KEY);
}

export function setStoredScope(userId: number | string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(SCOPE_KEY, String(userId));
}

export function clearStoredScope(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(SCOPE_KEY);
}

/**
 * Ensures the cached/queued data belongs to the supplied user. If a different
 * user (or no user) is detected, all persisted offline data is wiped and the
 * scope is updated to the new owner.
 */
export async function ensureScopeForUser(userId: number | string): Promise<void> {
  const stored = getStoredScope();
  const next = String(userId);
  if (stored === next) return;
  await offlineDb.mutations.clear();
  await offlineDb.cache.clear();
  clearPersistedQueryCache();
  setStoredScope(next);
}
