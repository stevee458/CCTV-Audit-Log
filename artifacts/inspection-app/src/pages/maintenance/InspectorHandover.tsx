import { useState } from "react";
import { useLocation } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListUsers, useListDrives, getListDrivesQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiErrorMessage, isOfflineQueued } from "@/lib/api-error";
import { DriveQrScanner, type ScannedDrive } from "@/components/DriveQrScanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Loader2, User as UserIcon } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

type Step = "inspector" | "direction" | "scan" | "confirm";
type Direction = "collect" | "deliver";

async function handoverDrive(input: {
  direction: Direction;
  driveId: number;
  inspectorUserId: number;
  confirmDriveId?: number;
  confirmDriveName?: string;
}): Promise<{ ok: boolean }> {
  return customFetch("/api/drives/handover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export default function InspectorHandover() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: allUsers } = useListUsers();
  const { data: myDrives } = useListDrives({ holderUserId: user?.id });

  const inspectors = (allUsers ?? []).filter((u) => u.role === "inspector" && u.active);
  const myDrivesInPossession = (myDrives ?? []).filter((d) => d.status === "In Maintenance possession");

  const [step, setStep] = useState<Step>("inspector");
  const [selectedInspector, setSelectedInspector] = useState<User | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [scanned, setScanned] = useState<ScannedDrive | null>(null);
  const [busy, setBusy] = useState(false);

  function initials(name: string) {
    return name.split(" ").map((p) => p[0]).join("").substring(0, 2).toUpperCase();
  }

  function handleSelectInspector(inspector: User) {
    setSelectedInspector(inspector);
    setStep("direction");
  }

  function handleSelectDirection(d: Direction) {
    if (d === "deliver" && myDrivesInPossession.length === 0) {
      toast({ title: "No drives to deliver", description: "You have no drives in your possession.", variant: "destructive" });
      return;
    }
    setDirection(d);
    setScanned(null);
    setStep("scan");
  }

  function handleScanned(drive: ScannedDrive) {
    setScanned(drive);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selectedInspector || !direction || !scanned) return;
    setBusy(true);
    try {
      const payload: Parameters<typeof handoverDrive>[0] = {
        direction,
        driveId: scanned.id,
        inspectorUserId: selectedInspector.id,
      };
      if (scanned.id !== 0) {
        payload.confirmDriveId = scanned.id;
      } else {
        payload.confirmDriveName = scanned.name;
      }
      await handoverDrive(payload);
      qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
      const verb = direction === "collect" ? "collected from" : "delivered to";
      toast({ title: "Done", description: `Drive ${scanned.name} ${verb} ${selectedInspector.name}.` });
      setLocation("/maintenance");
    } catch (e) {
      if (isOfflineQueued(e)) {
        toast({ title: "Saved offline", description: "Will sync when back online." });
        setLocation("/maintenance");
        return;
      }
      toast({ title: "Failed", description: apiErrorMessage(e) ?? "Handover failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const stepNum: Record<Step, number> = { inspector: 1, direction: 2, scan: 3, confirm: 3 };

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === "inspector") setLocation("/maintenance");
              else if (step === "direction") setStep("inspector");
              else if (step === "scan") setStep("direction");
              else setStep("scan");
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">At Inspector</h1>
            <p className="text-xs text-muted-foreground">Step {stepNum[step]} of 3</p>
          </div>
        </div>

        {/* Step 1 — Select Inspector */}
        {step === "inspector" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Inspector</p>
            {inspectors.length === 0 && (
              <p className="text-sm text-muted-foreground">No active inspectors found.</p>
            )}
            {inspectors.map((inspector) => (
              <button
                key={inspector.id}
                className="w-full flex items-center gap-3 p-4 rounded-xl border bg-card text-left hover:bg-accent/50 transition-colors"
                onClick={() => handleSelectInspector(inspector)}
              >
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">
                  {initials(inspector.name)}
                </div>
                <div>
                  <p className="font-semibold">{inspector.name}</p>
                  <p className="text-xs text-muted-foreground">{inspector.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Direction */}
        {step === "direction" && selectedInspector && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                {initials(selectedInspector.name)}
              </div>
              <span className="font-medium">{selectedInspector.name}</span>
            </div>

            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">What are you doing?</p>

            {/* COLLECT */}
            <button
              className="w-full rounded-2xl p-5 text-left border-2 border-emerald-500 bg-card hover:bg-emerald-500/5 transition-colors"
              onClick={() => handleSelectDirection("collect")}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <ArrowDownToLine className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-0.5">Collect</p>
                  <p className="text-base font-bold leading-tight">Receive drive FROM Inspector</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Inspector → You</p>
                </div>
              </div>
            </button>

            {/* DELIVER */}
            <button
              className="w-full rounded-2xl p-5 text-left border-2 border-amber-500 bg-card hover:bg-amber-500/5 transition-colors"
              onClick={() => handleSelectDirection("deliver")}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <ArrowUpFromLine className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-0.5">Deliver</p>
                  <p className="text-base font-bold leading-tight">Hand drive TO Inspector</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You → Inspector
                    {myDrivesInPossession.length > 0 && ` · ${myDrivesInPossession.length} in hand`}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 3 — Scan */}
        {step === "scan" && selectedInspector && direction && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {direction === "collect" ? (
                <ArrowDownToLine className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">
                {direction === "collect" ? "Collecting from" : "Delivering to"}{" "}
                <strong>{selectedInspector.name}</strong>
              </span>
            </div>

            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Scan Drive QR</p>

            <DriveQrScanner
              label={
                direction === "collect"
                  ? "Scan the drive you are receiving from the Inspector"
                  : "Scan the drive you are handing to the Inspector"
              }
              candidateDrives={direction === "deliver" ? myDrivesInPossession : undefined}
              onDetected={handleScanned}
            />
          </div>
        )}

        {/* Step 3b — Confirm */}
        {step === "confirm" && selectedInspector && direction && scanned && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Confirm Handover</p>

            <div className="rounded-xl border divide-y">
              <div className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Drive</p>
                <p className="font-mono font-semibold">{scanned.name}</p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Inspector</p>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{selectedInspector.name}</p>
                </div>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Action</p>
                <div className="flex items-center gap-2">
                  {direction === "collect" ? (
                    <>
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">With Inspector</Badge>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">In Maintenance possession</Badge>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">In Maintenance possession</Badge>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">With Inspector</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Drive QR verified
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep("scan")} disabled={busy}>
                Re-scan
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={busy}>
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming...</> : "Confirm Handover"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
