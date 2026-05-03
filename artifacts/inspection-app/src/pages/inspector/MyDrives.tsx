import { Link } from "wouter";
import { useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import {
  useListDrives,
  useAcceptDrive,
  useReturnDrive,
  useListUsers,
  getListDrivesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, HardDrive } from "lucide-react";
import { ConfirmDriveDialog } from "@/components/ConfirmDriveDialog";
import { apiErrorMessage } from "@/lib/api-error";

export default function MyDrives() {
  const { user } = useAuth();
  const { data: mine } = useListDrives({ holderUserId: user?.id });
  const { data: users } = useListUsers();
  const maintainers = users?.filter(u => u.role === "maintenance") ?? [];
  const qc = useQueryClient();
  const { toast } = useToast();

  const [acceptFor, setAcceptFor] = useState<number | null>(null);
  const [returnFor, setReturnFor] = useState<number | null>(null);
  const [returnTo, setReturnTo] = useState("");

  const accept = useAcceptDrive({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListDrivesQueryKey() }); setAcceptFor(null); toast({ title: "Accepted" }); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });
  const ret = useReturnDrive({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListDrivesQueryKey() }); setReturnFor(null); setReturnTo(""); toast({ title: "Returned" }); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  return (
    <InspectorLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" asChild className="-ml-3"><Link href="/inspector"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>
        <h1 className="text-2xl font-bold tracking-tight">My Drives</h1>

        <Card>
          <CardContent className="pt-4 space-y-2">
            {mine?.length === 0 && <p className="text-sm text-muted-foreground">No drives currently assigned.</p>}
            {mine?.map(d => (
              <div key={d.id} className="p-3 border rounded space-y-2" data-testid={`drive-${d.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2"><HardDrive className="h-4 w-4" />{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.homeVenueName ?? "Inspector drive"}</div>
                  </div>
                  <Badge>{d.status}</Badge>
                </div>
                <div className="flex gap-2">
                  {d.status === "In transit to Inspector" && (
                    <ConfirmDriveDialog
                      open={acceptFor === d.id}
                      onOpenChange={(v) => setAcceptFor(v ? d.id : null)}
                      driveName={d.name}
                      title={`Accept ${d.name}`}
                      description="Confirm the drive identity before taking custody."
                      trigger={<Button size="sm" data-testid={`btn-accept-${d.id}`}>Accept</Button>}
                      busy={accept.isPending}
                      onConfirm={(confirmDriveName) => accept.mutate({ id: d.id, data: { confirmDriveName } })}
                    />
                  )}
                  {d.status === "With Inspector" && (
                    <ConfirmDriveDialog
                      open={returnFor === d.id}
                      onOpenChange={(v) => setReturnFor(v ? d.id : null)}
                      driveName={d.name}
                      title={`Return ${d.name}`}
                      description="Confirm the drive identity before handing back to maintenance."
                      trigger={<Button size="sm" variant="outline" data-testid={`btn-return-${d.id}`}>Return to maintenance</Button>}
                      busy={ret.isPending}
                      confirmDisabled={!returnTo}
                      extra={
                        <div className="space-y-1">
                          <Select value={returnTo} onValueChange={setReturnTo}>
                            <SelectTrigger data-testid="select-return"><SelectValue placeholder="Maintainer" /></SelectTrigger>
                            <SelectContent>{maintainers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      }
                      onConfirm={(confirmDriveName) => ret.mutate({ id: d.id, data: { toUserId: Number(returnTo), confirmDriveName } })}
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
