import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListDrives, useListStockRequests, useListMaintenanceVisits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { HardDrive, Wrench, Package, Plus } from "lucide-react";

export default function MaintenanceDashboard() {
  const { user } = useAuth();
  const { data: myDrives } = useListDrives({ holderUserId: user?.id });
  const { data: pendingRequests } = useListStockRequests({ status: "Requested" });
  const { data: visits } = useListMaintenanceVisits();

  const inTransitToMe = myDrives?.filter(d => d.status === "In transit to Maintenance") ?? [];
  const inMyPossession = myDrives?.filter(d => d.status === "In Maintenance possession") ?? [];

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground text-sm">Drives, stock, and venue visits at a glance.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> In transit</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold" data-testid="stat-in-transit">{inTransitToMe.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> In hand</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold" data-testid="stat-in-hand">{inMyPossession.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Pending stock</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingRequests?.length ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Visits</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{visits?.length ?? 0}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Drives in transit to me</CardTitle>
            <Button size="sm" variant="outline" asChild><Link href="/maintenance/drives">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {inTransitToMe.length === 0 && <p className="text-sm text-muted-foreground">Nothing in transit.</p>}
            {inTransitToMe.map(d => (
              <Link key={d.id} href={`/maintenance/drives/${d.id}`} className="flex items-center justify-between p-3 rounded border hover-elevate" data-testid={`drive-${d.id}`}>
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.homeVenueName ?? "Inspector drive"}</div>
                </div>
                <Badge>{d.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button asChild size="lg" className="h-auto py-4 flex-col gap-1">
            <Link href="/maintenance/visits/new"><Plus className="h-5 w-5" /><span>Start visit</span></Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-auto py-4 flex-col gap-1">
            <Link href="/maintenance/requests/new"><Plus className="h-5 w-5" /><span>Request stock</span></Link>
          </Button>
        </div>
      </div>
    </MaintenanceLayout>
  );
}
