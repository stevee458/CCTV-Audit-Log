import { useState } from "react";
import { useLocation } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListDepots, useCreateMaintenanceVisit, getListMaintenanceVisitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { ArrowLeft } from "lucide-react";

export default function NewMaintenanceVisit() {
  const [, setLocation] = useLocation();
  const { data: depots } = useListDepots();
  const [depotId, setDepotId] = useState("");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateMaintenanceVisit({
    mutation: {
      onSuccess: (v) => {
        qc.invalidateQueries({ queryKey: getListMaintenanceVisitsQueryKey() });
        toast({ title: "Visit started" });
        setLocation(`/maintenance/visits/${v.id}`);
      },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });
  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/maintenance/visits")} className="-ml-3"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card>
          <CardHeader><CardTitle>New visit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={depotId} onValueChange={setDepotId}>
              <SelectTrigger data-testid="select-depot"><SelectValue placeholder="Select depot" /></SelectTrigger>
              <SelectContent>{depots?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-notes" />
            <Button
              disabled={!depotId || create.isPending}
              onClick={() => create.mutate({ data: { depotId: Number(depotId), notes: notes || null } })}
              data-testid="btn-start-visit"
            >Start visit</Button>
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
