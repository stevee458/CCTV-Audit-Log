import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  MapPin,
} from "lucide-react";
import {
  useListAdminDepots,
  useCreateDepot,
  useUpdateDepot,
  useDeleteDepot,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
  getListAdminDepotsQueryKey,
  getListDepotsQueryKey,
  getListAssetsQueryKey,
} from "@workspace/api-client-react";

export default function AdminDepots() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: depots, isLoading } = useListAdminDepots();

  const [openDepots, setOpenDepots] = useState<Set<number>>(new Set());
  const [openVenues, setOpenVenues] = useState<Set<number>>(new Set());

  const [editingDepotId, setEditingDepotId] = useState<number | null>(null);
  const [editingDepotName, setEditingDepotName] = useState("");

  const [editingVenueId, setEditingVenueId] = useState<number | null>(null);
  const [editingVenueName, setEditingVenueName] = useState("");
  const [editingVenueCode, setEditingVenueCode] = useState("");

  const [addingVenueToDepot, setAddingVenueToDepot] = useState<number | null>(null);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueCode, setNewVenueCode] = useState("");

  const [addingCameraToVenue, setAddingCameraToVenue] = useState<number | null>(null);
  const [newCameraLabel, setNewCameraLabel] = useState("");

  const [editingCamId, setEditingCamId] = useState<number | null>(null);
  const [editingCamNotes, setEditingCamNotes] = useState("");

  const [newDepotName, setNewDepotName] = useState("");
  const [addingDepot, setAddingDepot] = useState(false);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListAdminDepotsQueryKey() });
    qc.invalidateQueries({ queryKey: getListDepotsQueryKey() });
    qc.invalidateQueries({ queryKey: getListAssetsQueryKey() });
  }

  const createDepot = useCreateDepot({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Depot added" }); setAddingDepot(false); setNewDepotName(""); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const updateDepot = useUpdateDepot({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Depot renamed" }); setEditingDepotId(null); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const deleteDepot = useDeleteDepot({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Depot deleted" }); },
      onError: (e) => toast({ title: "Cannot delete", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const createVenue = useCreateVenue({
    mutation: {
      onSuccess: (_, vars) => {
        invalidateAll();
        toast({ title: "Venue added" });
        setAddingVenueToDepot(null);
        setNewVenueName("");
        setNewVenueCode("");
        setOpenDepots(prev => new Set([...prev, vars.depotId]));
      },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const updateVenue = useUpdateVenue({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Venue updated" }); setEditingVenueId(null); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const deleteVenue = useDeleteVenue({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Venue removed" }); },
      onError: (e) => toast({ title: "Cannot remove", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const createCamera = useCreateAsset({
    mutation: {
      onSuccess: (_, vars) => {
        invalidateAll();
        toast({ title: "Camera added" });
        setAddingCameraToVenue(null);
        setNewCameraLabel("");
        const venueId = (vars.data as { venueId: number }).venueId;
        setOpenVenues(prev => new Set([...prev, venueId]));
      },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const deleteCamera = useDeleteAsset({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Camera removed" }); },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const updateCamera = useUpdateAsset({
    mutation: {
      onSuccess: () => { invalidateAll(); setEditingCamId(null); },
      onError: (e) => toast({ title: "Failed to save description", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  function saveCamNotes(id: number, override?: string) {
    const notes = override !== undefined ? override : editingCamNotes.trim();
    updateCamera.mutate({ id, data: { notes: notes || null } });
  }

  function toggleDepot(id: number) {
    setOpenDepots(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleVenue(id: number) {
    setOpenVenues(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Depots & Venues</h1>
            <p className="text-muted-foreground">Manage depot sites, venues, and their cameras.</p>
          </div>
          {!addingDepot && (
            <Button onClick={() => setAddingDepot(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Depot
            </Button>
          )}
        </div>

        {addingDepot && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-medium mb-2">New depot name</p>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="e.g. Soweto (Putcoton)"
                  value={newDepotName}
                  onChange={e => setNewDepotName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newDepotName.trim()) createDepot.mutate({ data: { name: newDepotName } });
                    if (e.key === "Escape") { setAddingDepot(false); setNewDepotName(""); }
                  }}
                  className="max-w-sm"
                />
                <Button
                  size="sm"
                  disabled={!newDepotName.trim() || createDepot.isPending}
                  onClick={() => createDepot.mutate({ data: { name: newDepotName } })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingDepot(false); setNewDepotName(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : depots?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No depots yet. Add one above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {depots?.map(depot => {
              const isOpen = openDepots.has(depot.id);
              const isEditingDepot = editingDepotId === depot.id;
              return (
                <Card key={depot.id} className={isOpen ? "border-primary/30" : ""}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDepot(depot.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      {isEditingDepot ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            autoFocus
                            value={editingDepotName}
                            onChange={e => setEditingDepotName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && editingDepotName.trim()) updateDepot.mutate({ id: depot.id, data: { name: editingDepotName } });
                              if (e.key === "Escape") setEditingDepotId(null);
                            }}
                            className="h-7 max-w-xs text-sm"
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!editingDepotName.trim()} onClick={() => updateDepot.mutate({ id: depot.id, data: { name: editingDepotName } })}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingDepotId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button className="flex-1 text-left font-semibold text-sm hover:text-primary transition-colors" onClick={() => toggleDepot(depot.id)}>
                          {depot.name}
                        </button>
                      )}
                      <Badge variant="secondary" className="text-xs shrink-0">{depot.venues.length} venue{depot.venues.length !== 1 ? "s" : ""}</Badge>
                      {!isEditingDepot && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={() => { setEditingDepotId(depot.id); setEditingDepotName(depot.name); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete depot?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>{depot.name}</strong>. All venues must be removed first.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteDepot.mutate({ id: depot.id })}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </CardHeader>

                  {isOpen && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="pl-6 space-y-2 border-l-2 border-border ml-1">
                        {depot.venues.map(venue => {
                          const isVenueOpen = openVenues.has(venue.id);
                          const isEditingVenue = editingVenueId === venue.id;
                          return (
                            <div key={venue.id} className="rounded-md border bg-muted/30">
                              <div className="flex items-center gap-2 px-3 py-2">
                                <button onClick={() => toggleVenue(venue.id)} className="text-muted-foreground hover:text-foreground">
                                  {isVenueOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {isEditingVenue ? (
                                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                                    <Input
                                      autoFocus
                                      value={editingVenueName}
                                      onChange={e => setEditingVenueName(e.target.value)}
                                      placeholder="Venue name"
                                      className="h-7 text-sm w-40"
                                    />
                                    <Input
                                      value={editingVenueCode}
                                      onChange={e => setEditingVenueCode(e.target.value)}
                                      placeholder="Code"
                                      className="h-7 text-sm w-24 uppercase"
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!editingVenueName.trim()}
                                      onClick={() => updateVenue.mutate({ id: venue.id, data: { name: editingVenueName, code: editingVenueCode } })}>
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingVenueId(null)}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <button className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors" onClick={() => toggleVenue(venue.id)}>
                                    {venue.name}
                                  </button>
                                )}
                                <Badge variant="outline" className="text-xs font-mono shrink-0">{venue.code}</Badge>
                                <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                                  <Camera className="h-3 w-3" />{venue.cameras.length}
                                </Badge>
                                {!isEditingVenue && (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-6 px-1.5 shrink-0" onClick={() => { setEditingVenueId(venue.id); setEditingVenueName(venue.name); setEditingVenueCode(venue.code); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-6 px-1.5 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remove venue?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will remove <strong>{venue.name}</strong> from {depot.name}. Venues with inspection history cannot be removed.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteVenue.mutate({ id: venue.id })}>
                                            Remove
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>

                              {isVenueOpen && (
                                <div className="px-4 pb-3 pt-1 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                                    <Camera className="h-3 w-3" /> Cameras at this venue
                                  </p>
                                  {venue.cameras.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic mb-2">No cameras registered.</p>
                                  ) : (
                                    <div className="space-y-1.5 mb-3">
                                      {venue.cameras.map(cam => (
                                        <div key={cam.id} className="text-sm bg-background rounded px-2 py-1.5 border">
                                          <div className="flex items-center gap-2">
                                            <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="flex-1 font-medium">{cam.label}</span>
                                            <Badge variant="outline" className={`text-xs shrink-0 ${cam.status === "Operational" ? "text-green-700 border-green-300" : "text-amber-700 border-amber-300"}`}>
                                              {cam.status}
                                            </Badge>
                                            <Button
                                              size="sm" variant="ghost"
                                              className="h-6 px-1.5 shrink-0"
                                              title="Edit coverage description"
                                              onClick={() => { setEditingCamId(cam.id); setEditingCamNotes(cam.notes ?? ""); }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-6 px-1.5 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Remove camera?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Remove <strong>{cam.label}</strong> from {venue.name}? This will also remove it from the Assets list.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteCamera.mutate({ id: cam.id })}>
                                                    Remove
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                          {editingCamId === cam.id ? (
                                            <div className="flex items-center gap-2 mt-1.5 pl-5">
                                              <Input
                                                autoFocus
                                                placeholder="e.g. Facing boom gate, wide angle view"
                                                value={editingCamNotes}
                                                onChange={e => setEditingCamNotes(e.target.value)}
                                                onKeyDown={e => {
                                                  if (e.key === "Enter") saveCamNotes(cam.id);
                                                  if (e.key === "Escape") setEditingCamId(null);
                                                }}
                                                className="h-7 text-xs flex-1"
                                              />
                                              <Button size="sm" className="h-7 px-2 shrink-0" disabled={updateCamera.isPending} onClick={() => saveCamNotes(cam.id)}>
                                                <Check className="h-3 w-3" />
                                              </Button>
                                              <Button size="sm" variant="outline" className="h-7 px-2 shrink-0 text-xs" disabled={updateCamera.isPending} onClick={() => saveCamNotes(cam.id, "")}>
                                                Clear
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={() => setEditingCamId(null)}>
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ) : cam.notes ? (
                                            <p className="text-xs text-muted-foreground mt-0.5 pl-5 italic">{cam.notes}</p>
                                          ) : (
                                            <p className="text-xs text-muted-foreground/40 mt-0.5 pl-5 italic">No coverage description</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {addingCameraToVenue === venue.id ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        autoFocus
                                        placeholder="What does this camera cover? e.g. Front entrance wide angle"
                                        value={newCameraLabel}
                                        onChange={e => setNewCameraLabel(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === "Enter" && newCameraLabel.trim()) {
                                            createCamera.mutate({ data: { venueId: venue.id, type: "Camera", label: newCameraLabel.trim() } });
                                          }
                                          if (e.key === "Escape") { setAddingCameraToVenue(null); setNewCameraLabel(""); }
                                        }}
                                        className="h-8 text-sm flex-1"
                                      />
                                      <Button size="sm" className="h-8 px-2 shrink-0" disabled={!newCameraLabel.trim() || createCamera.isPending}
                                        onClick={() => createCamera.mutate({ data: { venueId: venue.id, type: "Camera", label: newCameraLabel.trim() } })}>
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={() => { setAddingCameraToVenue(null); setNewCameraLabel(""); }}>
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setAddingCameraToVenue(venue.id); setNewCameraLabel(""); }}>
                                      <Plus className="h-3 w-3" /> Add Camera
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {addingVenueToDepot === depot.id ? (
                          <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">New venue</p>
                            <div className="flex gap-2 flex-wrap">
                              <Input
                                autoFocus
                                placeholder="Venue name e.g. Main Gate"
                                value={newVenueName}
                                onChange={e => setNewVenueName(e.target.value)}
                                className="h-8 text-sm flex-1 min-w-40"
                              />
                              <Input
                                placeholder="Code e.g. P_XX01"
                                value={newVenueCode}
                                onChange={e => setNewVenueCode(e.target.value.toUpperCase())}
                                className="h-8 text-sm w-32 font-mono"
                                onKeyDown={e => {
                                  if (e.key === "Enter" && newVenueName.trim() && newVenueCode.trim()) {
                                    createVenue.mutate({ depotId: depot.id, data: { name: newVenueName, code: newVenueCode } });
                                  }
                                  if (e.key === "Escape") { setAddingVenueToDepot(null); setNewVenueName(""); setNewVenueCode(""); }
                                }}
                              />
                              <Button size="sm" className="h-8 px-2 shrink-0" disabled={!newVenueName.trim() || !newVenueCode.trim() || createVenue.isPending}
                                onClick={() => createVenue.mutate({ depotId: depot.id, data: { name: newVenueName, code: newVenueCode } })}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={() => { setAddingVenueToDepot(null); setNewVenueName(""); setNewVenueCode(""); }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7"
                            onClick={() => { setAddingVenueToDepot(depot.id); setNewVenueName(""); setNewVenueCode(""); if (!isOpen) toggleDepot(depot.id); }}>
                            <Plus className="h-3.5 w-3.5" /> Add venue to {depot.name}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
