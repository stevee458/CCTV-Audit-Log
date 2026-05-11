import { useParams, useLocation } from "wouter";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { useGetInspection, useCompleteInspection, useAddFinding, useUpdateFinding, useDeleteFinding, useListViolationCategories, getGetInspectionQueryKey, getListInspectionsQueryKey, getGetStatsOverviewQueryKey, getGetRecentInspectionsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Plus, FileText, AlertTriangle, ShieldCheck, Loader2, Video, MoreVertical, Edit, Trash2, HardDrive, Building2, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CopyButton } from "@/components/CopyButton";

const severityLabels: Record<string, string> = {
  A: "A — Death, Significant Asset Loss",
  B: "B — Injury, Asset Loss, Incident requiring scrutiny, Risk of A",
  C: "C — Significant Failure to follow procedure, Risk of B",
  D: "D — Inactivity, Failure to follow procedure, Risk of C",
  E: "E — Minor Infractions, Risk of D",
};

const severityColors: Record<string, string> = {
  A: "bg-red-500/15 text-red-700 border-red-500/20",
  B: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  C: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  D: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  E: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
};

const findingSchema = z.object({
  outcome: z.enum(["no_violation", "violation"]),
  categoryId: z.coerce.number().optional().nullable(),
  severity: z.enum(["A", "B", "C", "D", "E"]).optional().nullable(),
  incidentTime: z.string().optional().nullable(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === "violation") {
    if (!data.categoryId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required for a violation", path: ["categoryId"] });
    }
    if (!data.severity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Severity is required for a violation", path: ["severity"] });
    }
    if (!data.incidentTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Time of incident is required for a violation", path: ["incidentTime"] });
    }
  }
});

export default function InspectionWorkspace() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inspection, isLoading } = useGetInspection(inspectionId, { query: { enabled: !!inspectionId, queryKey: getGetInspectionQueryKey(inspectionId) }});
  const { data: categories } = useListViolationCategories();

  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [outcomeSelection, setOutcomeSelection] = useState<"no_violation"|"violation"|null>(null);
  const [editingFindingId, setEditingFindingId] = useState<number | null>(null);

  const completeMutation = useCompleteInspection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInspectionQueryKey(inspectionId) });
        queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentInspectionsQueryKey() });
        toast({ title: "Inspection marked complete" });
        setLocation("/inspector");
      },
      onError: (err) => toast({ title: "Error", description: apiErrorMessage(err), variant: "destructive" })
    }
  });

  const addFindingMutation = useAddFinding({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInspectionQueryKey(inspectionId) });
        queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentInspectionsQueryKey() });
        toast({ title: "Finding added" });
        setFindingDialogOpen(false);
      },
      onError: (err) => toast({ title: "Error", description: apiErrorMessage(err), variant: "destructive" })
    }
  });

  const updateFindingMutation = useUpdateFinding({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInspectionQueryKey(inspectionId) });
        queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsOverviewQueryKey() });
        toast({ title: "Finding updated" });
        setFindingDialogOpen(false);
      },
      onError: (err) => toast({ title: "Error", description: apiErrorMessage(err), variant: "destructive" })
    }
  });

  const deleteFindingMutation = useDeleteFinding({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInspectionQueryKey(inspectionId) });
        queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsOverviewQueryKey() });
        toast({ title: "Finding deleted" });
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed to delete finding", variant: "destructive" }),
    }
  });

  const form = useForm<z.infer<typeof findingSchema>>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      outcome: "no_violation",
      categoryId: null,
      severity: null,
      incidentTime: null,
      notes: "",
    }
  });

  const selectedCategoryId = form.watch("categoryId");

  const handleOutcomeSelect = (outcome: "no_violation"|"violation") => {
    setOutcomeSelection(outcome);
    form.setValue("outcome", outcome);
    if (outcome === "no_violation") {
      form.setValue("categoryId", null);
      form.setValue("severity", null);
    }
  };

  const openNewFinding = () => {
    setEditingFindingId(null);
    setOutcomeSelection(null);
    form.reset({
      outcome: "no_violation",
      categoryId: null,
      severity: null,
      incidentTime: null,
      notes: "",
    });
    setFindingDialogOpen(true);
  };

  const openEditFinding = (finding: any) => {
    setEditingFindingId(finding.id);
    setOutcomeSelection(finding.outcome);
    form.reset({
      outcome: finding.outcome,
      categoryId: finding.categoryId,
      severity: finding.severity,
      incidentTime: finding.incidentTime || null,
      notes: finding.notes || "",
    });
    setFindingDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof findingSchema>) => {
    if (editingFindingId) {
      updateFindingMutation.mutate({
        id: editingFindingId,
        data: values as any,
      });
    } else {
      addFindingMutation.mutate({
        id: inspectionId,
        data: values as any,
      });
    }
  };

  if (isLoading) {
    return (
      <InspectorLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </InspectorLayout>
    );
  }

  if (!inspection) return <div className="p-4">Not found</div>;

  const isCompleted = inspection.status === "completed";

  return (
    <InspectorLayout>
      <div className="flex flex-col h-full bg-muted/10">
        <div className="bg-background border-b p-4 sticky top-14 z-20 shadow-sm space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/inspector")}
            className="text-muted-foreground -ml-2 h-8"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Button>

          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              {/* Depot → Venue breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>{inspection.depotName}</span>
                <span className="text-muted-foreground/50">›</span>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{inspection.venueName}</span>
                <span className="text-muted-foreground/40 mx-0.5">({inspection.venueCode})</span>
              </div>

              {/* Drive name as primary heading */}
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground shrink-0" />
                {inspection.driveName || inspection.venueCode}
                {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </h1>

              {/* Date */}
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-3.5 w-3.5" />
                {format(new Date(inspection.footageDate), "d MMM yyyy")}
              </div>
            </div>

            <Badge variant="outline" className={isCompleted ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
              {isCompleted ? "Completed" : "In Progress"}
            </Badge>
          </div>

          {inspection.notes && (
            <div className="bg-muted p-2 rounded-md text-sm flex items-start text-muted-foreground">
              <FileText className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
              <p>{inspection.notes}</p>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 space-y-4">
          <h2 className="text-lg font-semibold flex items-center justify-between">
            Findings ({inspection.findings.length})
          </h2>

          <div className="space-y-3">
            {inspection.findings.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg bg-muted/30">
                <p className="text-muted-foreground">No findings recorded yet.</p>
              </div>
            ) : (
              inspection.findings.map((finding) => (
                <Card key={finding.id} className="border-l-4 overflow-hidden relative" style={{ borderLeftColor: finding.outcome === 'violation' ? (finding.severity ? `var(--color-chart-${finding.severity === 'A' ? 1 : finding.severity === 'B' ? 2 : finding.severity === 'C' ? 3 : finding.severity === 'D' ? 4 : 5})` : 'hsl(var(--destructive))') : 'hsl(var(--muted))' }}>
                  <CardContent className="p-3 pl-4 pr-10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-sm font-semibold flex items-center text-foreground/80">
                        <Video className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        {finding.clipName}
                        <CopyButton value={finding.clipName} />
                      </span>

                      {finding.outcome === "violation" ? (
                        <Badge variant="outline" className={finding.severity ? severityColors[finding.severity] : ""}>
                          {finding.severity}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 hover:bg-green-500/10">No Violation</Badge>
                      )}
                    </div>

                    {finding.outcome === "violation" && (
                      <div className="mt-1.5 font-medium text-sm">
                        {finding.categoryName}
                      </div>
                    )}

                    {finding.outcome === "violation" && finding.incidentTime && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                        <Timer className="h-3 w-3" />
                        <span>{finding.incidentTime}</span>
                      </div>
                    )}

                    {finding.notes && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                        {finding.notes}
                      </p>
                    )}
                  </CardContent>

                  {!isCompleted && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-1 h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditFinding(finding)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteFindingMutation.mutate({ id: finding.id })}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {!isCompleted && (
          <div className="sticky bottom-0 p-4 bg-background border-t shadow-lg flex gap-3 z-20">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => completeMutation.mutate({ id: inspectionId })}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Complete
            </Button>
            <Button
              className="flex-[2] text-md shadow-md"
              size="lg"
              onClick={openNewFinding}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Finding
            </Button>
          </div>
        )}
      </div>

      <Dialog open={findingDialogOpen} onOpenChange={setFindingDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-0 overflow-hidden">
          {!outcomeSelection ? (
            <>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>Review Clip</DialogTitle>
                <DialogDescription>What is the outcome of the current clip?</DialogDescription>
              </DialogHeader>

              {/* Context: depot / venue / drive */}
              <div className="px-6 pb-2">
                <div className="bg-muted/60 rounded-lg px-3 py-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{inspection.depotName}</span>
                    <span className="text-muted-foreground/40">›</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{inspection.venueName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-foreground/80">{inspection.driveName || inspection.venueCode}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(new Date(inspection.footageDate), "d MMM yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 grid gap-4 pt-2">
                <Button
                  variant="outline"
                  className="h-24 text-lg border-2 border-green-500/20 hover:border-green-500 hover:bg-green-500/5 text-green-700"
                  onClick={() => handleOutcomeSelect("no_violation")}
                >
                  <ShieldCheck className="mr-2 h-6 w-6 text-green-600" />
                  No Violation
                </Button>
                <Button
                  variant="outline"
                  className="h-24 text-lg border-2 border-red-500/20 hover:border-red-500 hover:bg-red-500/5 text-red-700"
                  onClick={() => handleOutcomeSelect("violation")}
                >
                  <AlertTriangle className="mr-2 h-6 w-6 text-red-600" />
                  Violation
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center">
                  <Button variant="ghost" size="icon" className="-ml-3 mr-2 h-8 w-8" onClick={() => setOutcomeSelection(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {outcomeSelection === "violation" ? "Record Violation" : "Confirm No Violation"}
                </DialogTitle>
              </DialogHeader>

              {/* Context: depot / venue / drive */}
              <div className="px-6 pt-3">
                <div className="bg-muted/60 rounded-lg px-3 py-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{inspection.depotName}</span>
                    <span className="text-muted-foreground/40">›</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{inspection.venueName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-foreground/80">{inspection.driveName || inspection.venueCode}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(new Date(inspection.footageDate), "d MMM yyyy")}</span>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 pt-4 space-y-4">
                  {outcomeSelection === "violation" && (
                    <>
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(parseInt(val, 10));
                                form.setValue("severity", undefined);
                              }}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64 overflow-y-auto">
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              disabled={!selectedCategoryId}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select severity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(Object.entries(severityLabels) as [string, string][]).map(([sev, label]) => (
                                  <SelectItem key={sev} value={sev}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="incidentTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5">
                              <Timer className="h-3.5 w-3.5" />
                              Time of Incident
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value || null)}
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes {outcomeSelection === "violation" ? "(Optional)" : "(Optional)"}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details about the clip..." className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className={outcomeSelection === "violation" ? "w-full bg-red-600 hover:bg-red-700 text-white" : "w-full bg-green-600 hover:bg-green-700 text-white"}
                      size="lg"
                      disabled={addFindingMutation.isPending || updateFindingMutation.isPending}
                    >
                      {(addFindingMutation.isPending || updateFindingMutation.isPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                      )}
                      {editingFindingId ? "Save Changes" : "Save Finding"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </InspectorLayout>
  );
}
