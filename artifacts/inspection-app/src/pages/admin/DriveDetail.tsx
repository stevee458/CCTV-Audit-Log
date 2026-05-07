import { useParams } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetDrive } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { driveStatusClass } from "@/lib/drive-status";

export default function AdminDriveDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: drive } = useGetDrive(Number(id));
  if (!drive) return <AdminLayout><div>Loading...</div></AdminLayout>;
  const apiBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const qrUrl = `${apiBase}/api/drives/${drive.id}/qr.png`;
  return (
    <AdminLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{drive.name}</CardTitle>
            <div className="flex gap-2"><Badge className={driveStatusClass(drive.status)}>{drive.status}</Badge><Badge variant="outline">{drive.type}</Badge></div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Home venue:</span> {drive.homeVenueName ?? "—"}</div>
            <div><span className="text-muted-foreground">Holder:</span> {drive.holderName ?? "—"}</div>
            {drive.notes && <div><span className="text-muted-foreground">Notes:</span> {drive.notes}</div>}
            <img src={qrUrl} alt="QR" className="w-40 h-40 mt-2 border rounded bg-white p-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Footage windows</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {drive.footageWindows.length === 0 && <p className="text-muted-foreground">None.</p>}
            {drive.footageWindows.slice().reverse().map(w => {
              const ageDays = (Date.now() - new Date(w.installedAt).getTime()) / 86400000;
              const faded = ageDays > 60;
              return (
                <div key={w.id} className={`p-2 border rounded ${faded ? "opacity-50" : ""}`} data-testid={`window-${w.id}`}>
                  <div className="font-medium">{w.venueName} ({w.venueCode})</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(w.installedAt), "PPp")} → {w.extractedAt ? format(new Date(w.extractedAt), "PPp") : "current"}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
