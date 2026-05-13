import { useParams } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import {
  useGetDrive,
  getListDrivesQueryKey,
  getGetDriveQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { driveStatusClass } from "@/lib/drive-status";

export default function MaintenanceDriveDetail() {
  const { id } = useParams<{ id: string }>();
  const driveId = Number(id);
  const { data: drive, isLoading } = useGetDrive(driveId);
  const qc = useQueryClient();

  if (isLoading || !drive) return <MaintenanceLayout><div className="p-4">Loading...</div></MaintenanceLayout>;

  const apiBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const qrUrl = `${apiBase}/api/drives/${drive.id}/qr.png`;

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => history.back()} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{drive.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={driveStatusClass(drive.status)}>{drive.status}</Badge>
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
            {drive.footageWindows.length === 0 && (
              <p className="text-muted-foreground">No footage recorded yet.</p>
            )}
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qc.invalidateQueries({ queryKey: getGetDriveQueryKey(driveId) });
            qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
          }}
        >
          Refresh
        </Button>
      </div>
    </MaintenanceLayout>
  );
}
