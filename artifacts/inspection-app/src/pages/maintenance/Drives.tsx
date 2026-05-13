import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListDrives } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { HardDrive } from "lucide-react";
import { driveStatusClass } from "@/lib/drive-status";

export default function MaintenanceDrives() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data: mine } = useListDrives({ holderUserId: user?.id });
  const { data: all } = useListDrives({ search: search || undefined });

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Drives</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">My drives</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mine?.length === 0 && (
              <p className="text-sm text-muted-foreground">No drives in your possession.</p>
            )}
            {mine?.map(d => (
              <Link key={d.id} href={`/maintenance/drives/${d.id}`} className="flex items-center justify-between p-3 rounded border" data-testid={`mine-drive-${d.id}`}>
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.homeVenueName ?? "—"}</div>
                </div>
                <Badge className={driveStatusClass(d.status)}>{d.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" /> All drives
            </CardTitle>
            <Input
              placeholder="Search by name or venue"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-drives"
            />
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
                <Badge className={driveStatusClass(d.status)}>{d.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
