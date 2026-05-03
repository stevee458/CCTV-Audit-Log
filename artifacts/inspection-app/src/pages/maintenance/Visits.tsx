import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListMaintenanceVisits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function MaintenanceVisits() {
  const { data: visits } = useListMaintenanceVisits();
  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Visits</h1>
          <Button asChild data-testid="btn-new-visit"><Link href="/maintenance/visits/new"><Plus className="h-4 w-4 mr-1" />New</Link></Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent visits</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {visits?.length === 0 && <p className="text-sm text-muted-foreground">No visits yet.</p>}
            {visits?.map(v => (
              <Link key={v.id} href={`/maintenance/visits/${v.id}`} className="block p-3 border rounded hover-elevate" data-testid={`visit-${v.id}`}>
                <div className="flex justify-between">
                  <div className="font-medium">{v.depotName}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(v.visitDate), "PP")}</div>
                </div>
                <div className="text-xs text-muted-foreground">by {v.maintainerName}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
