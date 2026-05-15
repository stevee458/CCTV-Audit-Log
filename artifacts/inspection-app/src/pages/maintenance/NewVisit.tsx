import { useState } from "react";
import { useLocation } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListDepots, useCreateMaintenanceVisit, useGetDepotMaintenanceIssues, getListMaintenanceVisitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { ArrowLeft, Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function NewMaintenanceVisit() {
  const [, setLocation] = useLocation();
  const { data: depots } = useListDepots();
  const [depotId, setDepotId] = useState("");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: maintenanceIssues } = useGetDepotMaintenanceIssues(Number(depotId), {
    query: { enabled: !!depotId },
  });

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
        <Button variant="ghost" onClick={() => setLocation("/maintenance/visits")} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>

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

        {depotId && maintenanceIssues && maintenanceIssues.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {maintenanceIssues.length} open maintenance {maintenanceIssues.length === 1 ? "issue" : "issues"} at this depot
              </CardTitle>
              <p className="text-xs text-amber-700/80">These issues were flagged during inspections and are awaiting repair.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {maintenanceIssues.map((issue) => (
                <div key={issue.id} className="border border-amber-500/20 rounded-md p-3 bg-background space-y-1">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="font-mono text-xs font-semibold text-foreground/80">{issue.clipName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{issue.venueName} ({issue.venueCode})</span>
                  </div>
                  <p className="text-sm">{issue.notes}</p>
                  <p className="text-xs text-muted-foreground">
                    Reported by {issue.inspectorName} · {format(new Date(issue.reportedAt), "d MMM yyyy")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MaintenanceLayout>
  );
}
