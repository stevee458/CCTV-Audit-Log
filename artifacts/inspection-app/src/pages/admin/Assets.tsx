import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListAssets,
  useCreateAsset,
  useUpdateAsset,
  useListDepots,
  getListAssetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { formatAge } from "@/lib/age";
import { Plus, Pencil } from "lucide-react";

const ASSET_TYPES = ["DVR", "Camera", "Power Supply", "Hard Drive", "Cable"];
const TYPES_WITH_INSTALLED_DATE = ["DVR", "Camera", "Power Supply", "Hard Drive"];

function showInstalledDate(type: string) {
  return TYPES_WITH_INSTALLED_DATE.includes(type);
}

interface AssetRow {
  id: number;
  venueId: number;
  venueName: string;
  type: string;
  label: string;
  serial: string | null;
  installedAt: string | null;
  status: string;
}

export default function AdminAssets() {
  const [search, setSearch] = useState("");
  const [filterDepotId, setFilterDepotId] = useState("");
  const [filterVenueId, setFilterVenueId] = useState("");

  const { data: depots } = useListDepots();
  const allVenues = depots?.flatMap(d => d.venues.map(v => ({ ...v, depotName: d.name }))) ?? [];

  const activeDepotId = filterDepotId && filterDepotId !== "all" ? Number(filterDepotId) : null;
  const activeVenueId = filterVenueId && filterVenueId !== "all" ? Number(filterVenueId) : null;

  const venueDropdownList = activeDepotId
    ? (depots?.find(d => d.id === activeDepotId)?.venues ?? [])
    : allVenues;

  const { data: allAssets } = useListAssets();

  const assets = (allAssets ?? []).filter(a => {
    if (search && !a.label.toLowerCase().includes(search.toLowerCase()) &&
        !a.type.toLowerCase().includes(search.toLowerCase()) &&
        !(a.venueName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (activeVenueId && a.venueId !== activeVenueId) return false;
    if (activeDepotId && !activeVenueId) {
      const depotVenueIds = new Set(depots?.find(d => d.id === activeDepotId)?.venues.map(v => v.id) ?? []);
      if (!depotVenueIds.has(a.venueId)) return false;
    }
    return true;
  });

  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState("");
  const [type, setType] = useState("");
  const [label, setLabel] = useState("");
  const [serial, setSerial] = useState("");
  const [installedAt, setInstalledAt] = useState("");

  function handleNewTypeChange(val: string) {
    setType(val);
    if (!showInstalledDate(val)) setInstalledAt("");
  }

  const create = useCreateAsset({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAssetsQueryKey() });
        toast({ title: "Asset created" });
        setOpen(false);
        setLabel(""); setSerial(""); setType(""); setVenueId(""); setInstalledAt("");
      },
      onError: (e: unknown) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  const [editAsset, setEditAsset] = useState<AssetRow | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editVenueId, setEditVenueId] = useState("");
  const [editInstalledAt, setEditInstalledAt] = useState("");

  function openEdit(a: AssetRow) {
    setEditAsset(a);
    setEditLabel(a.label);
    setEditSerial(a.serial ?? "");
    setEditVenueId(String(a.venueId));
    setEditInstalledAt(a.installedAt ?? "");
  }

  function closeEdit() {
    setEditAsset(null);
  }

  const update = useUpdateAsset({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAssetsQueryKey() });
        toast({ title: "Asset updated" });
        closeEdit();
      },
      onError: (e: unknown) => toast({ title: "Failed to save", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  function saveEdit() {
    if (!editAsset) return;
    const data: Parameters<typeof update.mutate>[0]["data"] = {
      label: editLabel,
      serial: editSerial || null,
      venueId: Number(editVenueId),
    };
    if (showInstalledDate(editAsset.type)) {
      data.installedAt = editInstalledAt || null;
    }
    update.mutate({ id: editAsset.id, data });
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="btn-new-asset"><Plus className="h-4 w-4 mr-1" />New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New asset</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={venueId} onValueChange={setVenueId}>
                  <SelectTrigger data-testid="select-asset-venue"><SelectValue placeholder="Venue" /></SelectTrigger>
                  <SelectContent>{allVenues.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.depotName} · {v.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={type} onValueChange={handleNewTypeChange}>
                  <SelectTrigger data-testid="select-asset-type"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} data-testid="input-asset-label" />
                <Input placeholder="Serial (optional)" value={serial} onChange={e => setSerial(e.target.value)} data-testid="input-asset-serial" />
                {showInstalledDate(type) && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Date of installation (optional)</label>
                    <Input
                      type="date"
                      value={installedAt}
                      onChange={e => setInstalledAt(e.target.value)}
                      data-testid="input-asset-installed-at"
                    />
                  </div>
                )}
                <Button
                  disabled={!venueId || !type || !label}
                  onClick={() => create.mutate({ data: { venueId: Number(venueId), type, label, serial: serial || null, installedAt: installedAt || null } })}
                  data-testid="btn-create-asset"
                >Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-assets"
              />
              <Select value={filterDepotId} onValueChange={v => { setFilterDepotId(v); setFilterVenueId(""); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All depots" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All depots</SelectItem>
                  {depots?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterVenueId} onValueChange={setFilterVenueId}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All venues" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All venues</SelectItem>
                  {venueDropdownList.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets?.map(a => (
                  <TableRow key={a.id} data-testid={`row-asset-${a.id}`}>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>{a.venueName}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.serial ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.installedAt
                        ? <span>{a.installedAt} <span className="opacity-60">({formatAge(a.installedAt)})</span></span>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(a)}
                        data-testid={`btn-edit-asset-${a.id}`}
                        aria-label={`Edit ${a.label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editAsset} onOpenChange={open => { if (!open) closeEdit(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit asset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Label</label>
              <Input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                data-testid="input-edit-asset-label"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Serial (optional)</label>
              <Input
                value={editSerial}
                onChange={e => setEditSerial(e.target.value)}
                data-testid="input-edit-asset-serial"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Venue</label>
              <Select value={editVenueId} onValueChange={setEditVenueId}>
                <SelectTrigger data-testid="select-edit-asset-venue"><SelectValue placeholder="Venue" /></SelectTrigger>
                <SelectContent>
                  {allVenues.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.depotName} · {v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editAsset && showInstalledDate(editAsset.type) && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Date of installation (optional)</label>
                <Input
                  type="date"
                  value={editInstalledAt}
                  onChange={e => setEditInstalledAt(e.target.value)}
                  data-testid="input-edit-asset-installed-at"
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                disabled={!editLabel || !editVenueId || update.isPending}
                onClick={saveEdit}
                data-testid="btn-save-asset"
              >Save</Button>
              <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
