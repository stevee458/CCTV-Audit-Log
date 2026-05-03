import {
  setRequestPreprocessor,
  setOfflineMutationHandler,
  type PreparedRequest,
} from "@workspace/api-client-react";
import { enqueueMutation } from "./queue";
import { IDEMPOTENCY_HEADER } from "./headers";

function genKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class OfflineQueuedError extends Error {
  readonly name = "OfflineQueuedError";
  readonly idempotencyKey: string;
  constructor(idempotencyKey: string) {
    super("Saved locally — will sync when you are back online.");
    this.idempotencyKey = idempotencyKey;
  }
}

export function installOfflineSupport(): void {
  setRequestPreprocessor((req: PreparedRequest) => {
    if (req.method === "GET" || req.method === "HEAD") return;
    if (!req.headers.has(IDEMPOTENCY_HEADER)) {
      req.headers.set(IDEMPOTENCY_HEADER, genKey());
    }
  });

  setOfflineMutationHandler(async (req: PreparedRequest) => {
    if (req.body !== null && req.body !== undefined && typeof req.body !== "string") {
      // FormData / Blob bodies cannot be safely persisted; surface the error.
      throw new Error("This action requires an internet connection.");
    }
    const item = await enqueueMutation({
      method: req.method,
      url: req.url,
      body: typeof req.body === "string" ? req.body : null,
      contentType: req.headers.get("content-type"),
    });
    throw new OfflineQueuedError(item.idempotencyKey);
  });
}
