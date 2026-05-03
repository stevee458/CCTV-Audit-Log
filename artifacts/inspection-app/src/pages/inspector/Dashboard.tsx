import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { useListInspections } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Clock, MapPin, CheckCircle2, HardDrive } from "lucide-react";

export default function InspectorDashboard() {
  const { data: inspections, isLoading } = useListInspections({ mine: true, status: "all" });

  const inProgress = inspections?.filter(i => i.status === "in_progress") || [];
  const completed = inspections?.filter(i => i.status === "completed") || [];

  return (
    <InspectorLayout>
      <div className="p-4 space-y-6">
        
        <div className="flex flex-col space-y-3 pt-2 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Your Workspace</h1>
          <p className="text-muted-foreground text-sm">Resume an active inspection or start a new review.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/inspector/new">
            <Button size="lg" className="w-full h-16 font-semibold shadow-sm hover-elevate" data-testid="btn-new-inspection">
              <Plus className="mr-2 h-5 w-5" />
              New Inspection
            </Button>
          </Link>
          <Link href="/inspector/drives">
            <Button size="lg" variant="secondary" className="w-full h-16 font-semibold hover-elevate" data-testid="btn-my-drives">
              <HardDrive className="mr-2 h-5 w-5" />
              My Drives
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Clock className="mr-2 h-5 w-5 text-amber-500" />
            In Progress ({inProgress.length})
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : inProgress.length === 0 ? (
            <Card className="border-dashed bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Video className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">No active inspections</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {inProgress.map(inspection => (
                <Link key={inspection.id} href={`/inspector/inspection/${inspection.id}`}>
                  <Card className="cursor-pointer hover:border-primary transition-colors active-elevate-2">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-bold flex items-center">
                          <Video className="mr-2 h-4 w-4 text-muted-foreground" />
                          DVR: {inspection.dvrNumber}
                        </CardTitle>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-sm text-muted-foreground space-y-1 mt-1">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-3.5 w-3.5" />
                          {inspection.depotName} • {inspection.venueCode}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-3.5 w-3.5" />
                          Footage: {format(new Date(inspection.footageDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {completed.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              Recently Completed
            </h2>
            <div className="grid gap-3">
              {completed.slice(0, 5).map(inspection => (
                <Link key={inspection.id} href={`/inspector/inspection/${inspection.id}`}>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors opacity-80 hover:opacity-100">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm flex items-center">
                          {inspection.dvrNumber} <span className="text-muted-foreground font-normal ml-2">• {inspection.venueCode}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {inspection.findingsCount} findings • {inspection.violationsCount} violations
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-normal text-xs">View</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </InspectorLayout>
  );
}
