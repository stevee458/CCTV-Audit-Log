import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListStockRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";

export default function MaintenanceRequests() {
  const { data: requests } = useListStockRequests();
  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="-ml-3"><Link href="/maintenance/stock"><ArrowLeft className="h-4 w-4 mr-2" />Stock</Link></Button>
          <Button asChild data-testid="btn-new"><Link href="/maintenance/requests/new"><Plus className="h-4 w-4 mr-1" />New</Link></Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Requests</h1>
        <Card>
          <CardContent className="space-y-2 pt-6">
            {requests?.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
            {requests?.map(r => (
              <div key={r.id} className="p-3 border rounded" data-testid={`request-${r.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.skuName} × {r.quantity}</div>
                  <Badge variant={r.status === "Collected" ? "secondary" : r.status === "Rejected" ? "destructive" : "default"}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">by {r.requesterName} · {format(new Date(r.createdAt), "PP")}</div>
                {r.reason && <div className="text-sm mt-1">{r.reason}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
