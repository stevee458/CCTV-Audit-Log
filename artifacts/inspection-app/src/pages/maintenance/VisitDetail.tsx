import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import {
  useGetMaintenanceVisit,
  useAddVenueInspectionVisit,
  useCreateRepair,
  useSwapDrive,
  useListDrives,
  useListAssets,
  useListDepots,
  useListStockSkus,
  useGetDepotMaintenanceIssues,
  useResolveFinding,
  getGetMaintenanceVisitQueryKey,
  getListDrivesQueryKey,
  getGetDepotMaintenanceIssuesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, ScanLine, Wrench, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiErrorMessage, isOfflineQueued } from "@/lib/api-error";
import { DriveSwapScanModal } from "@/components/DriveSwapScanModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const visitId = Number(id);
  const [, setLocation] = useLocation();
  const { data: visit } = useGetMaintenanceVisit(visitId);
  const { data: depots } = useListDepots();
  const qc = useQueryClient();
  const { toast } = useToast();

  const depotId = visit?.depotId ?? 0;
  const { data: maintenanceIssues } = useGetDepotMaintenanceIssues(depotId, {
    query: { enabled: !!depotId },
  });

  const [confirmResolveId, setConfirmResolveId] = useState<number | null>(null);

  const resolveMutation = useResolveFinding({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepotMaintenanceIssuesQueryKey(depotId) });
        toast({ title: "Marked as repaired" });
        setConfirmResolveId(null);
      },
      onError: (e) => {
        toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" });
        setConfirmResolveId(null);
      },
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetMaintenanceVisitQueryKey(visitId) });
    qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
  };

  const [venueId, setVenueId] = useState("");
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [repairAssetId, setRepairAssetId] = useState("");
  const [repairAction, setRepairAction] = useState<"repair" | "replace">("repair");
  const [repairDesc, setRepairDesc] = useState("");
  const [labourCost, setLabourCost] = useState("0");
  const [chargeCost, setChargeCost] = useState("0");
  const [consumption, setConsumption] = useState<Array<{ skuId: number; quantity: number }>>([]);
  const [pickSkuId, setPickSkuId] = useState("");
  const [pickQty, setPickQty] = useState("1");

  const venues = depots?.find(d => d.id === visit?.depotId)?.venues ?? [];
  const selectedVenue = venues.find(v => v.id.toString() === venueId);

  const { data: venueDrives } = useListDrives({ venueId: venueId ? Number(venueId) : undefined, type: "venue" });
  const { data: assets } = useListAssets({ venueId: venueId ? Number(venueId) : undefined });
  const { data: skus } = useListStockSkus();

  const addVenue = useAddVenueInspectionVisit({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Venue added" }); }, onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }) },
  });
  const swap = useSwapDrive({
    mutation: {
      onSuccess: () => {
        refresh();
        toast({ title: "Swap recorded" });
        setSwapModalOpen(false);
      },
      onError: (e) => {
        if (isOfflineQueued(e)) {
          toast({ title: "Saved offline", description: "Swap will sync when you're back online." });
          setSwapModalOpen(false);
          return;
        }
        toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" });
      },
    },
  });
  const repair = useCreateRepair({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Repair logged" }); setRepairDesc(""); setConsumption([]); }, onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }) },
  });

  const computedPartsCents = consumption.reduce((sum, c) => {
    const sku = skus?.find(s => s.id === c.skuId);
    const unit = sku?.lastUnitCostCents ?? 0;
    return sum + c.quantity * unit;
  }, 0);

  if (!visit) return <MaintenanceLayout><div className="p-4">Loading...</div></MaintenanceLayout>;

  const confirmingIssue = maintenanceIssues?.find(i => i.id === confirmResolveId);

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/maintenance/visits")} className="-ml-3"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card>
          <CardHeader>
            <CardTitle>Visit · {visit.depotName}</CardTitle>
            <p className="text-sm text-muted-foreground">{format(new Date(visit.visitDate), "PPp")} by {visit.maintainerName}</p>
          </CardHeader>
        </Card>

        {maintenanceIssues && maintenanceIssues.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {maintenanceIssues.length} open maintenance {maintenanceIssues.length === 1 ? "issue" : "issues"}
              </CardTitle>
              <p className="text-xs text-amber-700/80">Mark each issue as repaired once you have addressed it on site.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {maintenanceIssues.map((issue) => (
                <div key={issue.id} className="border border-amber-500/20 rounded-md p-3 bg-background space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-foreground/80">{issue.clipName}</span>
                        <span className="text-xs text-muted-foreground">{issue.venueName} ({issue.venueCode})</span>
                      </div>
                      <p className="text-sm">{issue.notes}</p>
                      <p className="text-xs text-muted-foreground">
                        Reported by {issue.inspectorName} · {format(new Date(issue.reportedAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-amber-500/30 text-amber-800 hover:bg-amber-500/10"
                      onClick={() => setConfirmResolveId(issue.id)}
                      data-testid={`btn-resolve-${issue.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Mark as repaired
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {maintenanceIssues && maintenanceIssues.length === 0 && depotId && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="py-3">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No open maintenance issues for this depot.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Venues visited</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {visit.venueVisits.map(vv => (
              <div key={vv.id} className="p-2 border rounded text-sm" data-testid={`vv-${vv.id}`}>
                <div className="font-medium">{vv.venueName} ({vv.venueCode})</div>
                <div className="text-xs text-muted-foreground">{format(new Date(vv.visitedAt), "PPp")}</div>
              </div>
            ))}
            <div className="flex gap-2">
              <Select value={venueId} onValueChange={setVenueId}>
                <SelectTrigger data-testid="select-venue"><SelectValue placeholder="Pick venue" /></SelectTrigger>
                <SelectContent>{venues.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.code})</SelectItem>)}</SelectContent>
              </Select>
              <Button
                disabled={!venueId}
                onClick={() => addVenue.mutate({ id: visitId, data: { venueId: Number(venueId) } })}
                data-testid="btn-add-venue"
              ><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {venueId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Swap drive</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {venueDrives?.map(d => (
                    <Badge key={d.id} variant="outline">{d.name} · {d.status}</Badge>
                  ))}
                  {(!venueDrives || venueDrives.length === 0) && (
                    <p className="text-xs text-muted-foreground">No drives associated with this venue.</p>
                  )}
                </div>
                <Button
                  onClick={() => setSwapModalOpen(true)}
                  data-testid="btn-swap"
                  disabled={!venueDrives || venueDrives.length === 0}
                >
                  <ScanLine className="h-4 w-4 mr-2" />Scan &amp; Swap
                </Button>

                <DriveSwapScanModal
                  open={swapModalOpen}
                  onOpenChange={setSwapModalOpen}
                  venueName={selectedVenue?.name ?? ""}
                  venueId={Number(venueId)}
                  drivesAtVenue={venueDrives ?? []}
                  busy={swap.isPending}
                  onConfirm={({ venueId: vid, extractDriveId, installDriveId }) =>
                    swap.mutate({ data: { venueId: vid, extractDriveId, installDriveId } })
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Log repair</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Select value={repairAssetId} onValueChange={setRepairAssetId}>
                  <SelectTrigger data-testid="select-asset"><SelectValue placeholder="Asset (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">— general —</SelectItem>
                    {assets?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.label} ({a.type})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={repairAction} onValueChange={v => setRepairAction(v as "repair" | "replace")}>
                  <SelectTrigger data-testid="select-action"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="replace">Replace</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Description" value={repairDesc} onChange={e => setRepairDesc(e.target.value)} data-testid="input-repair-desc" />

                <div className="space-y-1 border rounded p-2">
                  <div className="text-xs font-medium">Stock used</div>
                  {consumption.length === 0 && <div className="text-xs text-muted-foreground">No items consumed yet.</div>}
                  {consumption.map((c, idx) => {
                    const sku = skus?.find(s => s.id === c.skuId);
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm" data-testid={`consume-${c.skuId}`}>
                        <span>{sku?.name ?? `SKU ${c.skuId}`} × {c.quantity}</span>
                        <Button size="sm" variant="ghost" onClick={() => setConsumption(consumption.filter((_, i) => i !== idx))} data-testid={`btn-remove-consume-${c.skuId}`}>Remove</Button>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Select value={pickSkuId} onValueChange={setPickSkuId}>
                      <SelectTrigger data-testid="select-consume-sku"><SelectValue placeholder="Pick SKU" /></SelectTrigger>
                      <SelectContent>
                        {skus?.filter(s => !consumption.some(c => c.skuId === s.id)).map(s => (
                          <SelectItem key={s.id} value={s.id.toString()} disabled={s.onHand <= 0}>
                            {s.name} (on hand: {s.onHand})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" value={pickQty} onChange={e => setPickQty(e.target.value)} className="w-20" data-testid="input-consume-qty" />
                    <Button
                      size="sm"
                      disabled={!pickSkuId || !pickQty || Number(pickQty) <= 0}
                      onClick={() => {
                        const skuId = Number(pickSkuId);
                        const qty = Number(pickQty);
                        const sku = skus?.find(s => s.id === skuId);
                        if (sku && sku.onHand < qty) {
                          toast({ title: "Insufficient stock", description: `Only ${sku.onHand} on hand.`, variant: "destructive" });
                          return;
                        }
                        setConsumption([...consumption, { skuId, quantity: qty }]);
                        setPickSkuId(""); setPickQty("1");
                      }}
                      data-testid="btn-add-consume"
                    >Add</Button>
                  </div>
                  <div className="text-xs text-muted-foreground pt-1">Parts cost is auto-calculated from consumed stock.</div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className="text-xs">
                    <div className="text-muted-foreground">Parts (auto)</div>
                    <div className="font-medium" data-testid="text-parts-auto">${(computedPartsCents/100).toFixed(2)}</div>
                  </div>
                  <Input type="number" placeholder="Labour ¢" value={labourCost} onChange={e => setLabourCost(e.target.value)} data-testid="input-labour" />
                  <Input type="number" placeholder="Charge ¢" value={chargeCost} onChange={e => setChargeCost(e.target.value)} data-testid="input-charge" />
                </div>
                <Button
                  onClick={() => repair.mutate({ data: {
                    visitId,
                    venueId: Number(venueId),
                    assetId: repairAssetId && repairAssetId !== "0" ? Number(repairAssetId) : null,
                    action: repairAction,
                    description: repairDesc || null,
                    labourCostCents: Number(labourCost) || 0,
                    clientChargeCents: Number(chargeCost) || 0,
                    consumption,
                  } })}
                  data-testid="btn-log-repair"
                >Log repair</Button>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Repairs in this visit</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {visit.repairs.length === 0 && <p className="text-muted-foreground">None yet.</p>}
            {visit.repairs.map(r => (
              <div key={r.id} className="p-2 border rounded" data-testid={`repair-${r.id}`}>
                <div className="font-medium">{r.venueName} · {r.action}{r.assetLabel ? ` · ${r.assetLabel}` : ""}</div>
                {r.description && <div className="text-xs">{r.description}</div>}
                <div className="text-xs text-muted-foreground">parts ${(r.partsCostCents/100).toFixed(2)} · labour ${(r.labourCostCents/100).toFixed(2)} · charge ${(r.clientChargeCents/100).toFixed(2)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmResolveId !== null} onOpenChange={(open) => { if (!open) setConfirmResolveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as repaired?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingIssue && (
                <>
                  <strong>{confirmingIssue.clipName}</strong> — {confirmingIssue.notes}
                  <br /><br />
                  Confirm that this maintenance issue has been physically addressed on site. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmResolveId !== null && resolveMutation.mutate({ id: confirmResolveId })}
              disabled={resolveMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="btn-confirm-resolve"
            >
              {resolveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Yes, mark as repaired
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MaintenanceLayout>
  );
}
