import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { offlineDb } from "./db";

const PERSIST_KEY = "react-query-cache";

const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    const row = await offlineDb.cache.get(key);
    return row ? (row.value as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await offlineDb.cache.put({ key, value, updatedAt: Date.now() });
  },
  async removeItem(key: string): Promise<void> {
    await offlineDb.cache.delete(key);
  },
};

export function createReactQueryPersister(): Persister {
  return createAsyncStoragePersister({
    storage: idbStorage,
    key: PERSIST_KEY,
    throttleTime: 1000,
  });
}

export async function clearPersistedQueryCache(): Promise<void> {
  try {
    await offlineDb.cache.delete(PERSIST_KEY);
  } catch {
    // ignore
  }
}
