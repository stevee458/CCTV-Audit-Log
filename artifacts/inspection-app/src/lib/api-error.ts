export type ApiErrorBody = { error?: string };

export function isOfflineQueued(e: unknown): boolean {
  return (
    !!e && typeof e === "object" && (e as { name?: string }).name === "OfflineQueuedError"
  );
}

export function apiErrorMessage(e: unknown, fallback?: string): string | undefined {
  if (isOfflineQueued(e)) {
    return "Saved locally. Will sync when you are back online.";
  }
  if (e && typeof e === "object" && "data" in e) {
    const data = (e as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const msg = (data as ApiErrorBody).error;
      if (typeof msg === "string" && msg.length > 0) return msg;
    }
  }
  return fallback;
}
