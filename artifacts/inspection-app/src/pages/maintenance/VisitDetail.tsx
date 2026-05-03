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
  getGetMaintenanceVisitQueryKey,
  getListDrivesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const visitId = Number(id);
  const [, setLocation] = useLocation();
  const { data: visit } = useGetMaintenanceVisit(visitId);
  const { data: depots } = useListDepots();
  const qc = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetMaintenanceVisitQueryKey(visitId) });
    qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
  };

  const [venueId, setVenueId] = useState("");
  const [installDriveId, setInstallDriveId] = useState("");
  const [extractDriveId, setExtractDriveId] = useState("");
  const [repairAssetId, setRepairAssetId] = useState("");
  const [repairAction, setRepairAction] = useState<"repair" | "replace">("repair");
  const [repairDesc, setRepairDesc] = useState("");
  const [partsCost, setPartsCost] = useState("0");
  const [labourCost, setLabourCost] = useState("0");
  const [chargeCost, setChargeCost] = useState("0");

  const venues = depots?.find(d => d.id === visit?.depotId)?.venues ?? [];

  const { data: venueDrives } = useListDrives({ venueId: venueId ? Number(venueId) : undefined, type: "venue" });
  const { data: assets } = useListAssets({ venueId: venueId ? Number(venueId) : undefined });

  const addVenue = useAddVenueInspectionVisit({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Venue added" }); }, onError: e => toast({ title: "Failed", description: (e.data as any)?.error, variant: "destructive" }) },
  });
  const swap = useSwapDrive({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Swap recorded" }); setInstallDriveId(""); setExtractDriveId(""); }, onError: e => toast({ title: "Failed", description: (e.data as any)?.error, variant: "destructive" }) },
  });
  const repair = useCreateRepair({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Repair logged" }); setRepairDesc(""); }, onError: e => toast({ title: "Failed", description: (e.data as any)?.error, variant: "destructive" }) },
  });

  if (!visit) return <MaintenanceLayout><div className="p-4">Loading...</div></MaintenanceLayout>;

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
              <CardHeader><CardTitle className="text-base">Swap drive</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">Drives at this venue:</p>
                {venueDrives?.map(d => <Badge key={d.id} variant="outline" className="mr-1">{d.name} · {d.status}</Badge>)}
                <Select value={extractDriveId} onValueChange={setExtractDriveId}>
                  <SelectTrigger data-testid="select-extract"><SelectValue placeholder="Extract (in DVR)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">— none —</SelectItem>
                    {venueDrives?.filter(d => d.status === "In DVR").map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={installDriveId} onValueChange={setInstallDriveId}>
                  <SelectTrigger data-testid="select-install"><SelectValue placeholder="Install (in your hands)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">— none —</SelectItem>
                    {venueDrives?.filter(d => d.status === "In Maintenance possession").map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!installDriveId && !extractDriveId}
                  onClick={() => swap.mutate({ data: {
                    venueId: Number(venueId),
                    installDriveId: installDriveId && installDriveId !== "0" ? Number(installDriveId) : null,
                    extractDriveId: extractDriveId && extractDriveId !== "0" ? Number(extractDriveId) : null,
                  } })}
                  data-testid="btn-swap"
                >Record swap</Button>
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
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Parts ¢" value={partsCost} onChange={e => setPartsCost(e.target.value)} data-testid="input-parts" />
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
                    partsCostCents: Number(partsCost) || 0,
                    labourCostCents: Number(labourCost) || 0,
                    clientChargeCents: Number(chargeCost) || 0,
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
    </MaintenanceLayout>
  );
}
