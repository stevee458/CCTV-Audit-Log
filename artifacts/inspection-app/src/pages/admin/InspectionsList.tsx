import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListInspections, useListDepots, useListViolationCategories, ListInspectionsStatus, ListInspectionsOutcome, ListInspectionsSeverity } from "@workspace/api-client-react";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, FileText, AlertTriangle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const severityColors: Record<string, string> = {
  A: "bg-red-500/15 text-red-700 border-red-500/20",
  B: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  C: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  D: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  E: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
};

export default function InspectionsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListInspectionsStatus | "">("");
  const [outcome, setOutcome] = useState<ListInspectionsOutcome | "">("");
  const [severity, setSeverity] = useState<ListInspectionsSeverity | "">("");
  const [depotId, setDepotId] = useState<string>("");

  const { data: depots } = useListDepots();
  
  const isReal = (v: string) => v && v !== "all" && v !== "none";
  const depotIdNum = isReal(depotId) ? parseInt(depotId, 10) : undefined;
  const { data: inspections, isLoading } = useListInspections({
    search: search || undefined,
    status: isReal(status) ? (status as ListInspectionsStatus) : undefined,
    outcome: isReal(outcome) ? (outcome as ListInspectionsOutcome) : undefined,
    severity: isReal(severity) ? (severity as ListInspectionsSeverity) : undefined,
    depotId: Number.isFinite(depotIdNum) ? depotIdNum : undefined,
  });

  const exportCsv = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (isReal(status)) params.set("status", status);
    if (isReal(outcome)) params.set("outcome", outcome);
    if (isReal(severity)) params.set("severity", severity);
    if (Number.isFinite(depotIdNum)) params.set("depotId", String(depotIdNum));
    const res = await fetch(`/api/inspections/export.csv?${params.toString()}`, {
      credentials: "include",
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inspections_export_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inspections Register</h1>
            <p className="text-muted-foreground">Search and filter through all inspection records.</p>
          </div>
          <Button onClick={exportCsv} variant="outline" className="shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search DVR, venue, or inspector..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={outcome} onValueChange={(val) => setOutcome(val as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    <SelectItem value="violation">Violations</SelectItem>
                    <SelectItem value="no_violation">Clean</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" /> More Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 space-y-4" align="end">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Severity</h4>
                      <Select value={severity} onValueChange={(val) => setSeverity(val as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any severity</SelectItem>
                          {["A", "B", "C", "D", "E"].map(s => (
                            <SelectItem key={s} value={s}>Class {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Depot</h4>
                      <Select value={depotId} onValueChange={setDepotId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any depot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any depot</SelectItem>
                          {depots?.map(d => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="secondary" className="w-full" onClick={() => {
                      setSeverity("");
                      setDepotId("");
                      setStatus("");
                      setOutcome("");
                      setSearch("");
                    }}>Reset Filters</Button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>DVR / Venue</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Results</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))
                  ) : inspections?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="h-8 w-8 mb-2 opacity-20" />
                          No inspections match filters
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inspections?.map((i) => (
                      <TableRow key={i.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-semibold">{i.dvrNumber}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{i.depotName} • {i.venueCode}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">Footage: {format(new Date(i.footageDate), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Created: {format(new Date(i.createdAt), 'MMM d, yyyy')}</div>
                        </TableCell>
                        <TableCell className="text-sm">{i.inspectorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={i.status === 'completed' ? "bg-green-500/10 text-green-700 border-green-500/20" : "bg-amber-500/10 text-amber-700 border-amber-500/20"}>
                            {i.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {i.violationsCount > 0 ? (
                            <div className="flex flex-col items-end">
                              <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20 mb-1">
                                <AlertTriangle className="mr-1 h-3 w-3" /> {i.violationsCount} Violations
                              </Badge>
                              {i.highestSeverity && (
                                <Badge variant="outline" className={`text-[10px] h-4 ${severityColors[i.highestSeverity]}`}>Max Class {i.highestSeverity}</Badge>
                              )}
                            </div>
                          ) : i.status === 'completed' ? (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">No Violations</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/inspections/${i.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
