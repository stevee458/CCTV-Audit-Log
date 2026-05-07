import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DriveQrScanner, type ScannedDrive } from "@/components/DriveQrScanner";
import { ArrowDown, CheckCircle2, ScanLine } from "lucide-react";

interface Drive {
  id: number;
  name: string;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  venueId: number;
  drivesAtVenue: Drive[];
  busy?: boolean;
  onConfirm: (payload: { venueId: number; extractDriveId: number | null; installDriveId: number | null }) => void;
}

type Step = "extract" | "install" | "confirm";

const drivesInDvr = (drives: Drive[]) => drives.filter((d) => d.status === "In DVR");
const drivesInPossession = (drives: Drive[]) => drives.filter((d) => d.status === "In Maintenance possession");

export function DriveSwapScanModal({ open, onOpenChange, venueName, venueId, drivesAtVenue, busy, onConfirm }: Props) {
  const [step, setStep] = useState<Step>("extract");
  const [extractDrive, setExtractDrive] = useState<ScannedDrive | null>(null);
  const [installDrive, setInstallDrive] = useState<ScannedDrive | null>(null);

  const canExtract = drivesInDvr(drivesAtVenue).length > 0;
  const canInstall = drivesInPossession(drivesAtVenue).length > 0;

  function handleClose(v: boolean) {
    if (!v) {
      setStep("extract");
      setExtractDrive(null);
      setInstallDrive(null);
    }
    onOpenChange(v);
  }

  function handleExtractDetected(drive: ScannedDrive) {
    setExtractDrive(drive);
    setStep("install");
  }

  function handleInstallDetected(drive: ScannedDrive) {
    setInstallDrive(drive);
    setStep("confirm");
  }

  function handleConfirm() {
    onConfirm({
      venueId,
      extractDriveId: extractDrive && extractDrive.id !== 0 ? extractDrive.id : null,
      installDriveId: installDrive && installDrive.id !== 0 ? installDrive.id : null,
    });
  }

  const stepLabels: Record<Step, string> = {
    extract: "Step 1 of 3 — Extract",
    install: "Step 2 of 3 — Install",
    confirm: "Step 3 of 3 — Confirm",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Drive swap — {venueName}</DialogTitle>
          <p className="text-xs text-muted-foreground">{stepLabels[step]}</p>
        </DialogHeader>

        {step === "extract" && (
          <div className="space-y-4">
            {canExtract ? (
              <DriveQrScanner
                label="Scan the drive being removed from the DVR"
                candidateDrives={drivesInDvr(drivesAtVenue)}
                onDetected={handleExtractDetected}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No drives currently in the DVR at this venue.</p>
                <Button variant="outline" size="sm" onClick={() => setStep("install")}>
                  Continue to install
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "install" && (
          <div className="space-y-4">
            {extractDrive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded p-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                Extract: <span className="font-mono font-medium">{extractDrive.name}</span>
              </div>
            )}
            {canInstall ? (
              <DriveQrScanner
                label="Scan the drive being installed into the DVR"
                candidateDrives={drivesInPossession(drivesAtVenue)}
                onDetected={handleInstallDetected}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No drives in your possession to install at this venue.</p>
                <Button variant="outline" size="sm" onClick={() => setStep("confirm")}>
                  Continue to confirm
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded border divide-y text-sm">
              {extractDrive ? (
                <div className="p-3 space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Removing from DVR</div>
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-emerald-500" />
                    <span className="font-mono font-medium">{extractDrive.name}</span>
                    <Badge variant="outline" className="text-xs">In DVR → Maintenance</Badge>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-muted-foreground text-xs">No drive extracted</div>
              )}
              <div className="flex justify-center py-1 text-muted-foreground">
                <ArrowDown className="h-4 w-4" />
              </div>
              {installDrive ? (
                <div className="p-3 space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Installing into DVR</div>
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-emerald-500" />
                    <span className="font-mono font-medium">{installDrive.name}</span>
                    <Badge variant="outline" className="text-xs">Maintenance → In DVR</Badge>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-muted-foreground text-xs">No drive installed</div>
              )}
            </div>

            {!extractDrive && !installDrive && (
              <p className="text-xs text-destructive">No drives scanned — nothing to record.</p>
            )}
            {canExtract && !extractDrive && (
              <p className="text-xs text-destructive">Extract drive must be scanned before confirming.</p>
            )}
            {canInstall && !installDrive && (
              <p className="text-xs text-destructive">Install drive must be scanned before confirming.</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>Cancel</Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  busy ||
                  (!extractDrive && !installDrive) ||
                  (canExtract && !extractDrive) ||
                  (canInstall && !installDrive)
                }
                data-testid="btn-confirm-swap"
              >
                {busy ? "Recording..." : "Confirm swap"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
