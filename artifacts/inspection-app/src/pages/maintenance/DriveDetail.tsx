import { useParams, useLocation } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import {
  useGetDrive,
  useReleaseDrive,
  useReturnDrive,
  useAcceptDrive,
  useListUsers,
  getListDrivesQueryKey,
  getGetDriveQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { ConfirmDriveDialog } from "@/components/ConfirmDriveDialog";
import { apiErrorMessage } from "@/lib/api-error";

export default function MaintenanceDriveDetail() {
  const { id } = useParams<{ id: string }>();
  const driveId = Number(id);
  const [, _setLocation] = useLocation();
  void _setLocation;
  const { user } = useAuth();
  const { data: drive, isLoading } = useGetDrive(driveId);
  const { data: users } = useListUsers();
  const inspectors = users?.filter(u => u.role === "inspector") ?? [];
  const maintainers = users?.filter(u => u.role === "maintenance") ?? [];
  const qc = useQueryClient();
  const { toast } = useToast();

  const [releaseTo, setReleaseTo] = useState<string>("");
  const [returnTo, setReturnTo] = useState<string>("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetDriveQueryKey(driveId) });
    qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
  };

  const release = useReleaseDrive({
    mutation: {
      onSuccess: () => { refresh(); setReleaseOpen(false); toast({ title: "Released" }); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });
  const accept = useAcceptDrive({
    mutation: {
      onSuccess: () => { refresh(); setAcceptOpen(false); toast({ title: "Accepted" }); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });
  const ret = useReturnDrive({
    mutation: {
      onSuccess: () => { refresh(); setReturnOpen(false); toast({ title: "Returned" }); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  if (isLoading || !drive) return <MaintenanceLayout><div className="p-4">Loading...</div></MaintenanceLayout>;

  const apiBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const qrUrl = `${apiBase}/api/drives/${drive.id}/qr.png`;

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => history.back()} className="-ml-3"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{drive.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{drive.status}</Badge>
              <Badge variant="outline">{drive.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Home venue:</span> {drive.homeVenueName ?? "—"}</div>
            <div><span className="text-muted-foreground">Holder:</span> {drive.holderName ?? "—"}</div>
            {drive.notes && <div><span className="text-muted-foreground">Notes:</span> {drive.notes}</div>}
            <img src={qrUrl} alt="QR" className="w-40 h-40 mt-2 border rounded bg-white p-2" data-testid="img-qr" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Footage windows</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {drive.footageWindows.length === 0 && <p className="text-muted-foreground">No footage recorded yet.</p>}
            {drive.footageWindows.slice().reverse().map(w => {
              const installed = new Date(w.installedAt);
              const ageDays = (Date.now() - installed.getTime()) / 86400000;
              const faded = ageDays > 60;
              return (
                <div key={w.id} className={`p-2 border rounded ${faded ? "opacity-50" : ""}`}>
                  <div className="font-medium">{w.venueName} ({w.venueCode})</div>
                  <div className="text-xs text-muted-foreground">
                    {format(installed, "PPp")} → {w.extractedAt ? format(new Date(w.extractedAt), "PPp") : "current"}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {drive.status === "In transit to Maintenance" && drive.holderUserId === user?.id && (
          <Card>
            <CardHeader><CardTitle className="text-base">Confirm receipt</CardTitle></CardHeader>
            <CardContent>
              <ConfirmDriveDialog
                open={acceptOpen}
                onOpenChange={setAcceptOpen}
                driveId={drive.id}
                driveName={drive.name}
                title={`Accept ${drive.name}`}
                description="Confirm the physical drive in your hand matches by scanning its QR or typing its name."
                trigger={<Button data-testid="btn-accept">Accept drive</Button>}
                busy={accept.isPending}
                onConfirm={(payload) => accept.mutate({ id: drive.id, data: payload })}
              />
            </CardContent>
          </Card>
        )}

        {drive.status === "In Maintenance possession" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Release to inspector</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Select value={releaseTo} onValueChange={setReleaseTo}>
                <SelectTrigger data-testid="select-release-to"><SelectValue placeholder="Select inspector" /></SelectTrigger>
                <SelectContent>{inspectors.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
              <ConfirmDriveDialog
                open={releaseOpen}
                onOpenChange={setReleaseOpen}
                driveId={drive.id}
                driveName={drive.name}
                title={`Release ${drive.name}`}
                description="Confirm the drive identity before handing over."
                trigger={<Button disabled={!releaseTo} data-testid="btn-release">Release</Button>}
                busy={release.isPending}
                confirmDisabled={!releaseTo}
                onConfirm={(payload) => release.mutate({ id: drive.id, data: { toUserId: Number(releaseTo), ...payload } })}
              />
            </CardContent>
          </Card>
        )}

        {drive.status === "With Inspector" && drive.holderUserId === user?.id && (
          <Card>
            <CardHeader><CardTitle className="text-base">Return to maintenance</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Select value={returnTo} onValueChange={setReturnTo}>
                <SelectTrigger data-testid="select-return-to"><SelectValue placeholder="Select maintainer" /></SelectTrigger>
                <SelectContent>{maintainers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
              <ConfirmDriveDialog
                open={returnOpen}
                onOpenChange={setReturnOpen}
                driveId={drive.id}
                driveName={drive.name}
                title={`Return ${drive.name}`}
                description="Confirm the drive identity before handing back."
                trigger={<Button disabled={!returnTo} data-testid="btn-return">Return</Button>}
                busy={ret.isPending}
                confirmDisabled={!returnTo}
                onConfirm={(payload) => ret.mutate({ id: drive.id, data: { toUserId: Number(returnTo), ...payload } })}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </MaintenanceLayout>
  );
}
