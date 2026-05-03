import { offlineDb, type QueuedMutation } from "./db";

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

function genKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueMutation(args: {
  method: string;
  url: string;
  body: string | null;
  contentType: string | null;
}): Promise<QueuedMutation> {
  const item: QueuedMutation = {
    idempotencyKey: genKey(),
    method: args.method,
    url: args.url,
    body: args.body,
    contentType: args.contentType,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
    status: "pending",
  };
  const id = await offlineDb.mutations.add(item);
  await notifyChange();
  return { ...item, id };
}

export async function listMutations(): Promise<QueuedMutation[]> {
  return offlineDb.mutations.orderBy("createdAt").toArray();
}

export async function pendingCount(): Promise<number> {
  return offlineDb.mutations.where("status").notEqual("failed").count();
}

export async function failedCount(): Promise<number> {
  return offlineDb.mutations.where("status").equals("failed").count();
}

export async function dismissFailed(id: number): Promise<void> {
  await offlineDb.mutations.delete(id);
  await notifyChange();
}

export async function notifyChange(): Promise<void> {
  const total = await offlineDb.mutations.count();
  for (const listener of listeners) listener(total);
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  void notifyChange();
  return () => {
    listeners.delete(listener);
  };
}
