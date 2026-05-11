import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetStatsOverview, useGetRecentInspections } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Activity, AlertTriangle, CheckCircle2, Clock, MapPin, Video } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: recentInspections, isLoading: recentLoading } = useGetRecentInspections();
  
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-2">Monitor depot operations and inspection status.</p>
        </div>

        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInspections}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.last7DaysInspections} in last 7 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgressInspections}</div>
                <p className="text-xs text-muted-foreground">
                  Active reviews
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Violations Found</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalViolations}</div>
                <p className="text-xs text-muted-foreground">
                  Across {stats.totalFindings} total findings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedInspections}</div>
                <p className="text-xs text-muted-foreground">
                  Finished reviews
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest completed and active inspections.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentInspections?.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center justify-center h-48 border rounded-md border-dashed">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-4">
                  {recentInspections?.map(inspection => (
                    <Link key={inspection.id} href={`/admin/inspections/${inspection.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer mb-3">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${inspection.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            <Video className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{inspection.dvrNumber}</div>
                            <div className="text-xs text-muted-foreground">{inspection.depotName} • {inspection.inspectorName}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={inspection.status === 'completed' ? 'border-green-500/20 text-green-700' : 'border-amber-500/20 text-amber-700'}>
                            {inspection.status === 'completed' ? 'Completed' : 'Active'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(inspection.createdAt), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>By Severity</CardTitle>
              <CardDescription>Breakdown of violations.</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-4 mt-2">
                  {stats?.bySeverity.map((sev) => (
                    <div key={sev.severity} className="flex items-center">
                      <div className="w-12 text-sm font-semibold">{sev.severity}</div>
                      <div className="flex-1 h-2 mx-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${stats.totalViolations ? (sev.count / stats.totalViolations) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-sm text-muted-foreground">{sev.count}</div>
                    </div>
                  ))}
                  {stats?.bySeverity.length === 0 && (
                    <div className="text-sm text-muted-foreground flex items-center justify-center h-24">
                      No violations recorded
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
