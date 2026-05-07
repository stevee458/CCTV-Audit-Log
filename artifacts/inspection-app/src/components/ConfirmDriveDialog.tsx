import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ScanLine } from "lucide-react";
import { DriveQrScanner, type ScannedDrive } from "@/components/DriveQrScanner";

export interface CustodyConfirmation {
  confirmDriveId?: number;
  confirmDriveName?: string;
}

interface Props {
  trigger: ReactNode;
  driveId: number;
  driveName: string;
  title: string;
  description?: string;
  direction?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: (payload: CustodyConfirmation) => void;
  extra?: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmDriveDialog({
  trigger, driveId, driveName, title, description, direction,
  open, onOpenChange, busy, onConfirm, extra, confirmDisabled,
}: Props) {
  const [scanned, setScanned] = useState<ScannedDrive | null>(null);

  function handleOpenChange(v: boolean) {
    if (!v) setScanned(null);
    onOpenChange(v);
  }

  function handleDetected(drive: ScannedDrive) {
    setScanned(drive);
  }

  function handleConfirm() {
    if (!scanned) return;
    if (scanned.id !== 0) {
      onConfirm({ confirmDriveId: driveId });
    } else {
      onConfirm({ confirmDriveName: scanned.name });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {extra}

          {!scanned ? (
            <DriveQrScanner
              label={`Scan or type the drive name to confirm`}
              expectedDriveId={driveId}
              expectedDriveName={driveName}
              onDetected={handleDetected}
            />
          ) : (
            <div className="space-y-3">
              <div className="rounded border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span className="font-mono font-medium">{scanned.name}</span>
                  <span className="text-emerald-600 text-xs">verified</span>
                </div>
                {direction && (() => {
                  const parts = direction.split("→").map(p => p.trim());
                  const from = parts[0];
                  const to = parts[parts.length - 1];
                  return (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        Current status: <span className="font-medium text-foreground">{from}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                        {parts.map((part, i, arr) => (
                          <span key={i} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs font-normal">{part}</Badge>
                            {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        New status: <span className="font-medium text-foreground">{to}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setScanned(null)}
                data-testid="btn-rescan"
              >
                Scan again
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            disabled={!scanned || busy || confirmDisabled}
            onClick={handleConfirm}
            data-testid="btn-confirm-custody"
          >
            {busy ? "Confirming..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
