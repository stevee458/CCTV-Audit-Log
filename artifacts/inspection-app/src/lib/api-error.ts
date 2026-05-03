export type ApiErrorBody = { error?: string };

export function apiErrorMessage(e: unknown, fallback?: string): string | undefined {
  if (e && typeof e === "object" && "data" in e) {
    const data = (e as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const msg = (data as ApiErrorBody).error;
      if (typeof msg === "string" && msg.length > 0) return msg;
    }
  }
  return fallback;
}
