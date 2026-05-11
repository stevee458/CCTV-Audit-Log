import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateInspection, useListDepots, useListDrives, getListInspectionsQueryKey, getGetStatsOverviewQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const newInspectionSchema = z.object({
  depotId: z.coerce.number().min(1, "Depot is required"),
  venueId: z.coerce.number().min(1, "Venue is required"),
  driveId: z.coerce.number().min(1, "Drive is required"),
  footageDate: z.date({ required_error: "Footage date is required" }),
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
    defaultValues: { notes: "" },
  });

  // Cascade: depot → venues
  const selectedDepotId = Number(form.watch("depotId"));
  const selectedDepot = depots?.find(d => d.id === selectedDepotId);
  const venues = selectedDepot?.venues ?? [];

  // Cascade: venue → drives (only held drives belonging to that venue)
  const selectedVenueId = Number(form.watch("venueId"));
  const selectedVenue = venues.find(v => v.id === selectedVenueId);
  const heldDrives = (myDrives ?? []).filter(d => d.status === "With Inspector");
  const venueDrives = selectedVenueId
    ? heldDrives.filter(d => d.homeVenueCode === selectedVenue?.code)
    : heldDrives;

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
          description: apiErrorMessage(error) || "An unexpected error occurred",
          variant: "destructive",
        });
      },
    },
  });

  function onSubmit(values: z.infer<typeof newInspectionSchema>) {
    createMutation.mutate({
      data: {
        depotId: values.depotId,
        venueId: values.venueId,
        driveId: values.driveId,
        footageDate: format(values.footageDate, "yyyy-MM-dd"),
        notes: values.notes || null,
      },
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

                {/* Step 1: Depot */}
                <FormField
                  control={form.control}
                  name="depotId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depot</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("venueId", 0 as any);
                          form.setValue("driveId", 0 as any);
                        }}
                        value={field.value?.toString() || ""}
                        disabled={depotsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={depotsLoading ? "Loading…" : "Select depot"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {depots?.map(depot => (
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

                {/* Step 2: Venue (filtered by depot) */}
                <FormField
                  control={form.control}
                  name="venueId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("driveId", 0 as any);
                        }}
                        value={field.value?.toString() || ""}
                        disabled={!selectedDepotId || venues.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedDepotId ? "Select depot first" :
                              venues.length === 0 ? "No venues found" :
                              "Select venue"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {venues.map(venue => (
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

                {/* Step 3: Drive (filtered by venue) */}
                <FormField
                  control={form.control}
                  name="driveId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drive</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString() || ""}
                        disabled={!selectedVenueId || venueDrives.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-drive">
                            <SelectValue placeholder={
                              !selectedVenueId ? "Select venue first" :
                              venueDrives.length === 0 ? "No drives held for this venue" :
                              "Select drive"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {venueDrives.map(d => (
                            <SelectItem key={d.id} value={d.id.toString()}>
                              {d.name} {d.homeVenueCode ? `(${d.homeVenueCode})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Only drives you currently hold for this venue are shown.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Step 4: Footage Date */}
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
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={date => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Select the date of the footage you are reviewing.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Step 5: Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any preliminary context…"
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
