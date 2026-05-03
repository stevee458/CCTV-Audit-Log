import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListDrives, useAcceptDrive, getListDrivesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { HardDrive } from "lucide-react";
import { ConfirmDriveDialog } from "@/components/ConfirmDriveDialog";
import { apiErrorMessage } from "@/lib/api-error";

export default function MaintenanceDrives() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data: mine } = useListDrives({ holderUserId: user?.id });
  const { data: all } = useListDrives({ search: search || undefined });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [acceptFor, setAcceptFor] = useState<number | null>(null);
  const accept = useAcceptDrive({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
        setAcceptFor(null);
        toast({ title: "Drive accepted" });
      },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Drives</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">My drives</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mine?.length === 0 && <p className="text-sm text-muted-foreground">No drives in your possession.</p>}
            {mine?.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded border" data-testid={`mine-drive-${d.id}`}>
                <Link href={`/maintenance/drives/${d.id}`} className="flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.homeVenueName ?? "—"}</div>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{d.status}</Badge>
                  {d.status === "In transit to Maintenance" && (
                    <ConfirmDriveDialog
                      open={acceptFor === d.id}
                      onOpenChange={(v) => setAcceptFor(v ? d.id : null)}
                      driveId={d.id}
                      driveName={d.name}
                      title={`Accept ${d.name}`}
                      description="Confirm the drive identity before taking custody."
                      trigger={<Button size="sm" data-testid={`accept-${d.id}`}>Accept</Button>}
                      busy={accept.isPending}
                      onConfirm={(payload) => accept.mutate({ id: d.id, data: payload })}
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><HardDrive className="h-4 w-4" /> All drives</CardTitle>
            <Input placeholder="Search by name or venue" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-drives" />
          </CardHeader>
          <CardContent className="space-y-2">
            {all?.map(d => (
              <Link key={d.id} href={`/maintenance/drives/${d.id}`} className="flex items-center justify-between p-3 rounded border hover-elevate" data-testid={`drive-row-${d.id}`}>
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.homeVenueName ?? "Inspector"} · holder: {d.holderName ?? "—"}
                  </div>
                </div>
                <Badge variant="outline">{d.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
