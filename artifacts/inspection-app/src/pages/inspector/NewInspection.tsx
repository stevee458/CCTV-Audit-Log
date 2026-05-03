import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateInspection, useListDepots, useListDrives, useGetDrive, getListInspectionsQueryKey, getGetStatsOverviewQueryKey, getGetDriveQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const newInspectionSchema = z.object({
  dvrNumber: z.string().min(1, "DVR number is required"),
  depotId: z.coerce.number().min(1, "Depot is required"),
  venueId: z.coerce.number().min(1, "Venue is required"),
  driveId: z.coerce.number().min(1, "Drive is required"),
  footageDate: z.date({
    required_error: "Footage date is required",
  }),
  notes: z.string().optional(),
});

export default function NewInspection() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { user } = useAuth();
  const { data: depots, isLoading: depotsLoading } = useListDepots();
  const { data: myDrives } = useListDrives({ holderUserId: user?.id });

  const form = useForm<z.infer<typeof newInspectionSchema>>({
    resolver: zodResolver(newInspectionSchema),
    defaultValues: {
      dvrNumber: "",
      notes: "",
    },
  });

  const selectedDepotId = Number(form.watch("depotId"));
  const selectedDepot = depots?.find(d => d.id === selectedDepotId);
  const venues = selectedDepot?.venues || [];

  const heldDrives = (myDrives ?? []).filter(d => d.status === "With Inspector");
  const selectedDriveId = Number(form.watch("driveId"));
  const selectedVenueId = Number(form.watch("venueId"));
  const { data: driveDetail } = useGetDrive(selectedDriveId, {
    query: { enabled: !!selectedDriveId, queryKey: getGetDriveQueryKey(selectedDriveId) },
  });
  const driveWindows = (driveDetail?.footageWindows ?? []).filter(
    (w) => !selectedVenueId || w.venueId === selectedVenueId,
  );

  function isDateInWindow(date: Date): boolean {
    if (driveWindows.length === 0) return false;
    return driveWindows.some((w) => {
      const start = new Date(w.installedAt);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const end = w.extractedAt ? new Date(w.extractedAt) : new Date();
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return date >= startDay && date <= endDay;
    });
  }

  const createMutation = useCreateInspection({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsOverviewQueryKey() });
        toast({ title: "Inspection created" });
        setLocation(`/inspector/inspection/${data.id}`);
      },
      onError: (error) => {
        toast({
          title: "Failed to create inspection",
          description: (error.data as any)?.error || "An unexpected error occurred",
          variant: "destructive",
        });
      },
    }
  });

  function onSubmit(values: z.infer<typeof newInspectionSchema>) {
    createMutation.mutate({
      data: {
        dvrNumber: values.dvrNumber,
        depotId: values.depotId,
        venueId: values.venueId,
        driveId: values.driveId,
        footageDate: format(values.footageDate, "yyyy-MM-dd"),
        notes: values.notes || null,
      }
    });
  }

  return (
    <InspectorLayout>
      <div className="p-4 space-y-6 pb-20">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/inspector")}
          className="text-muted-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">New Inspection</h1>
          <p className="text-muted-foreground text-sm">Start reviewing a new CCTV footage block.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="dvrNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DVR Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. DVR-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="depotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depot</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("venueId", 0 as any); // Reset venue
                          }} 
                          value={field.value?.toString() || ""}
                          disabled={depotsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={depotsLoading ? "Loading..." : "Select depot"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {depots?.map((depot) => (
                              <SelectItem key={depot.id} value={depot.id.toString()}>
                                {depot.name}
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
                    name="venueId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value?.toString() || ""}
                          disabled={!selectedDepotId || venues.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedDepotId ? "Select depot first" : 
                                venues.length === 0 ? "No venues found" : "Select venue"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {venues.map((venue) => (
                              <SelectItem key={venue.id} value={venue.id.toString()}>
                                {venue.name} ({venue.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="driveId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drive</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString() || ""}
                        disabled={heldDrives.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-drive">
                            <SelectValue placeholder={
                              heldDrives.length === 0 ? "No drives in your possession" : "Select drive you collected"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {heldDrives.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>
                              {d.name} {d.homeVenueCode ? `(${d.homeVenueCode})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>You can only inspect footage from drives you currently hold.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="footageDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Footage Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01") || !isDateInWindow(date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        {selectedDriveId
                          ? driveWindows.length === 0
                            ? "No footage windows available for this drive at the selected venue."
                            : `Pick a date inside one of this drive's footage windows for the selected venue (${driveWindows.length} available).`
                          : "Select a drive first."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any preliminary context..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create and Start Review
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
