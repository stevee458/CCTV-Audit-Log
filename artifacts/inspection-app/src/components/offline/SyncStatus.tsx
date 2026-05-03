import { useState } from "react";
import { CloudOff, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useOnlineStatus, usePendingSyncCount, useQueuedMutations } from "@/lib/offline/hooks";
import { runSync } from "@/lib/offline/sync-runner";
import { dismissFailed } from "@/lib/offline/queue";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function SyncStatus() {
  const online = useOnlineStatus();
  const pending = usePendingSyncCount();
  const items = useQueuedMutations();
  const failed = items.filter((i) => i.status === "failed");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleSync = async () => {
    if (!online) {
      toast({ title: "You are offline", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await runSync();
      qc.invalidateQueries();
      if (r.drained === 0 && r.failed === 0) {
        toast({ title: "Already up to date" });
      } else {
        toast({ title: `Synced ${r.drained} change${r.drained === 1 ? "" : "s"}` });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="btn-sync-status">
          {online ? <CheckCircle2 className="h-5 w-5" /> : <CloudOff className="h-5 w-5 text-amber-500" />}
          {pending > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-amber-500 text-amber-950 text-[10px] font-bold h-4 min-w-4 px-1"
              data-testid="badge-pending-count"
            >
              {pending}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{online ? "Online" : "Offline"}</p>
              <p className="text-xs text-muted-foreground">
                {pending === 0
                  ? "No pending changes"
                  : `${pending} change${pending === 1 ? "" : "s"} waiting to sync`}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={busy || !online}
              data-testid="btn-sync-now"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${busy ? "animate-spin" : ""}`} />
              Sync now
            </Button>
          </div>
          {failed.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Sync errors
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {failed.map((m) => (
                  <div key={m.id} className="rounded border p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">{m.method}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => m.id && dismissFailed(m.id)}
                        data-testid={`btn-dismiss-failed-${m.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="truncate text-muted-foreground" title={m.url}>{m.url}</p>
                    {m.lastError && <p className="text-destructive">{m.lastError}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
