import { useParams, Link } from "wouter";
import { useGetInspection } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MapPin, Video, AlertTriangle, CheckCircle2, FileText, User } from "lucide-react";

const severityColors: Record<string, string> = {
  A: "bg-red-500/15 text-red-700 border-red-500/20",
  B: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  C: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  D: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  E: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
};

export default function AdminInspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = parseInt(id || "0", 10);
  
  const { data: inspection, isLoading } = useGetInspection(inspectionId, { query: { enabled: !!inspectionId }});

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Button variant="ghost" asChild className="-ml-4 text-muted-foreground">
          <Link href="/admin/inspections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Register
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !inspection ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-lg font-semibold">Inspection not found</h2>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                  DVR: {inspection.dvrNumber}
                  {inspection.status === "completed" && <CheckCircle2 className="ml-3 h-6 w-6 text-green-500" />}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4" /> {inspection.depotName} • {inspection.venueCode}</span>
                  <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> {format(new Date(inspection.footageDate), 'MMM d, yyyy')}</span>
                  <span className="flex items-center"><User className="mr-1.5 h-4 w-4" /> {inspection.inspectorName}</span>
                </div>
              </div>
              <Badge variant="outline" className={inspection.status === 'completed' ? "bg-green-500/10 text-green-700 border-green-500/20 text-sm px-3 py-1" : "bg-amber-500/10 text-amber-700 border-amber-500/20 text-sm px-3 py-1"}>
                {inspection.status === 'completed' ? 'Completed' : 'In Progress'}
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Findings Log</CardTitle>
                    <CardDescription>
                      {inspection.findings.length} clips reviewed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {inspection.findings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                        No findings recorded.
                      </div>
                    ) : (
                      inspection.findings.map(finding => (
                        <div key={finding.id} className="flex gap-4 p-4 rounded-lg border bg-card relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${finding.outcome === 'violation' ? (finding.severity ? `bg-chart-${finding.severity === 'A' ? 1 : finding.severity === 'B' ? 2 : finding.severity === 'C' ? 3 : finding.severity === 'D' ? 4 : 5}` : 'bg-destructive') : 'bg-muted'}`} />
                          
                          <div className="flex-1 pl-2">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-mono text-sm font-semibold flex items-center">
                                <Video className="mr-2 h-4 w-4 text-muted-foreground" />
                                {finding.clipName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(finding.createdAt), 'HH:mm')}
                              </div>
                            </div>
                            
                            {finding.outcome === "violation" ? (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className={finding.severity ? severityColors[finding.severity] : ""}>
                                    Class {finding.severity}
                                  </Badge>
                                  <span className="font-medium text-sm">
                                    {finding.categoryName} <span className="text-muted-foreground mx-1">›</span> {finding.subCategoryName}
                                  </span>
                                </div>
                                {finding.notes && (
                                  <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded mt-2">
                                    {finding.notes}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <Badge variant="secondary" className="bg-green-500/10 text-green-700">No Violation</Badge>
                                {finding.notes && (
                                  <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded mt-2">
                                    {finding.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Started</div>
                      <div>{format(new Date(inspection.createdAt), 'PPpp')}</div>
                    </div>
                    {inspection.completedAt && (
                      <div>
                        <div className="text-muted-foreground mb-1">Completed</div>
                        <div>{format(new Date(inspection.completedAt), 'PPpp')}</div>
                      </div>
                    )}
                    {inspection.notes && (
                      <div>
                        <div className="text-muted-foreground mb-1">General Notes</div>
                        <p className="text-foreground bg-muted/50 p-2 rounded">{inspection.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground text-sm">Total Findings</span>
                      <span className="font-semibold">{inspection.findings.length}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground text-sm">Violations</span>
                      <span className="font-semibold text-destructive">{inspection.findings.filter(f => f.outcome === 'violation').length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
