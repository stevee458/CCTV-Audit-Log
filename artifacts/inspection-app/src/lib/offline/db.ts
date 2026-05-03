import Dexie, { type Table } from "dexie";

export interface QueuedMutation {
  id?: number;
  idempotencyKey: string;
  method: string;
  url: string;
  body: string | null;
  contentType: string | null;
  createdAt: number;
  attempts: number;
  lastError: string | null;
  status: "pending" | "syncing" | "failed";
}

export interface CachedQueryEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

class OfflineDB extends Dexie {
  mutations!: Table<QueuedMutation, number>;
  cache!: Table<CachedQueryEntry, string>;

  constructor() {
    super("inspection-app-offline-v1");
    this.version(1).stores({
      mutations: "++id, status, createdAt, idempotencyKey",
      cache: "key, updatedAt",
    });
  }
}

export const offlineDb = new OfflineDB();

export async function clearOfflineData(): Promise<void> {
  await Promise.all([offlineDb.mutations.clear(), offlineDb.cache.clear()]);
}
