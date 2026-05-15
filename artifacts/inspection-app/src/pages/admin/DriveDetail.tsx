import { useParams } from "wouter";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetDrive, useUpdateDrive, getGetDriveQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { driveStatusClass } from "@/lib/drive-status";
import { formatAge } from "@/lib/age";
import { useToast } from "@/hooks/use-toast";

export default function AdminDriveDetail() {
  const { id } = useParams<{ id: string }>();
  const driveId = Number(id);
  const { data: drive } = useGetDrive(driveId);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState("");

  const update = useUpdateDrive({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDriveQueryKey(driveId) });
        toast({ title: "Commission date saved" });
        setEditingDate(false);
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    },
  });

  function startEdit() {
    setDateInput(drive?.installedAt ?? "");
    setEditingDate(true);
  }

  function saveDate() {
    update.mutate({ id: driveId, data: { installedAt: dateInput || null } });
  }

  function clearDate() {
    update.mutate({ id: driveId, data: { installedAt: null } });
  }

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

            <div className="flex items-center gap-2 pt-1">
              <span className="text-muted-foreground">Commission date:</span>
              {editingDate ? (
                <>
                  <Input
                    type="date"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    className="h-7 w-auto text-xs"
                    data-testid="input-drive-installed-at"
                  />
                  <Button size="sm" variant="default" onClick={saveDate} disabled={update.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDate(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  {drive.installedAt
                    ? <span>{drive.installedAt} <span className="text-muted-foreground">({formatAge(drive.installedAt)})</span></span>
                    : <span className="text-muted-foreground">Not set</span>}
                  <Button size="sm" variant="outline" onClick={startEdit} data-testid="btn-edit-commission-date">
                    {drive.installedAt ? "Edit" : "Set date"}
                  </Button>
                  {drive.installedAt && (
                    <Button size="sm" variant="ghost" onClick={clearDate} disabled={update.isPending} className="text-muted-foreground">
                      Clear
                    </Button>
                  )}
                </>
              )}
            </div>

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
