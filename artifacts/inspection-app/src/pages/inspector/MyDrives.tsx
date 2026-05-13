import { Link } from "wouter";
import { useCallback, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { useListDrives, getListDrivesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, HardDrive } from "lucide-react";
import { driveStatusClass } from "@/lib/drive-status";

export default function MyDrives() {
  const { user } = useAuth();
  const { data: mine } = useListDrives({ holderUserId: user?.id });
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
    } finally {
      setIsRefreshing(false);
    }
  }, [qc]);

  return (
    <InspectorLayout onRefresh={handleRefresh} isRefreshing={isRefreshing}>
      <div className="p-4 space-y-4">
        <Button variant="ghost" asChild className="-ml-3">
          <Link href="/inspector"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">My Drives</h1>

        <Card>
          <CardContent className="pt-4 space-y-2">
            {mine?.length === 0 && (
              <p className="text-sm text-muted-foreground">No drives currently assigned.</p>
            )}
            {mine?.map(d => (
              <div key={d.id} className="p-3 border rounded" data-testid={`drive-${d.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />{d.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{d.homeVenueName ?? "Inspector drive"}</div>
                  </div>
                  <Badge className={driveStatusClass(d.status)}>{d.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
