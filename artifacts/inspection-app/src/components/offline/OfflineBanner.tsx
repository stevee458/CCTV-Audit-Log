import { WifiOff } from "lucide-react";
import { useOnlineStatus, usePendingSyncCount } from "@/lib/offline/hooks";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const pending = usePendingSyncCount();
  if (online) return null;
  return (
    <div
      className="bg-amber-500/95 text-amber-950 text-sm px-4 py-2 flex items-center gap-2 justify-center"
      data-testid="offline-banner"
    >
      <WifiOff className="h-4 w-4" />
      <span>You are offline. Changes are saved locally and will sync when you reconnect.</span>
      {pending > 0 && (
        <span className="font-medium" data-testid="offline-pending-count">
          {pending} pending
        </span>
      )}
    </div>
  );
}
