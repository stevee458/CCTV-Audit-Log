import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListDrives,
  useUpdateDrive,
  useListDepots,
  getListDrivesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Pencil } from "lucide-react";
import { driveStatusClass } from "@/lib/drive-status";
import { formatAge } from "@/lib/age";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";

const DRIVE_TYPES = ["venue", "inspector"] as const;

interface DriveRow {
  id: number;
  name: string;
  type: string;
  homeVenueId: number | null;
  homeVenueName: string | null;
  status: string;
  holderName: string | null;
  notes: string | null;
  installedAt: string | null;
}

export default function AdminDrives() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { data } = useListDrives({ search: search || undefined });
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: depots } = useListDepots();
  const allVenues = depots?.flatMap(d => d.venues.map(v => ({ ...v, depotName: d.name }))) ?? [];

  const allIds = data?.map(d => d.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  useEffect(() => {
    if (!data) return;
    const visibleIds = new Set(data.map(d => d.id));
    setSelected(prev => {
      const next = new Set([...prev].filter(id => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function printLabels() {
    const ids = Array.from(selected).join(",");
    navigate(`/admin/drives/labels?ids=${ids}`);
  }

  const [editDrive, setEditDrive] = useState<DriveRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editHomeVenueId, setEditHomeVenueId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editInstalledAt, setEditInstalledAt] = useState("");

  function openEdit(d: DriveRow) {
    setEditDrive(d);
    setEditName(d.name);
    setEditType(d.type);
    setEditHomeVenueId(d.homeVenueId ? String(d.homeVenueId) : "none");
    setEditNotes(d.notes ?? "");
    setEditInstalledAt(d.installedAt ?? "");
  }

  function closeEdit() {
    setEditDrive(null);
  }

  const update = useUpdateDrive({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDrivesQueryKey() });
        toast({ title: "Drive updated" });
        closeEdit();
      },
      onError: (e: unknown) => toast({ title: "Failed to save", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  function saveEdit() {
    if (!editDrive) return;
    update.mutate({
      id: editDrive.id,
      data: {
        name: editName,
        type: editType,
        homeVenueId: editHomeVenueId && editHomeVenueId !== "none" ? Number(editHomeVenueId) : null,
        notes: editNotes || null,
        installedAt: editInstalledAt || null,
      },
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Drives</h1>
          {someSelected && (
            <Button onClick={printLabels} data-testid="btn-print-labels">
              <Printer className="mr-2 h-4 w-4" />
              Print Labels ({selected.size})
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All drives</CardTitle>
            <Input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" data-testid="input-search" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Drive</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Home venue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Commissioned</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map(d => (
                  <TableRow key={d.id} data-testid={`row-drive-${d.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(d.id)}
                        onCheckedChange={() => toggleOne(d.id)}
                        aria-label={`Select ${d.name}`}
                        data-testid={`checkbox-drive-${d.id}`}
                      />
                    </TableCell>
                    <TableCell><Link href={`/admin/drives/${d.id}`} className="font-medium hover:underline">{d.name}</Link></TableCell>
                    <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                    <TableCell>{d.homeVenueName ?? "—"}</TableCell>
                    <TableCell><Badge className={driveStatusClass(d.status)}>{d.status}</Badge></TableCell>
                    <TableCell>{d.holderName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.installedAt
                        ? <span>{d.installedAt} <span className="opacity-60">({formatAge(d.installedAt)})</span></span>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(d)}
                        data-testid={`btn-edit-drive-${d.id}`}
                        aria-label={`Edit ${d.name}`}
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

      <Dialog open={!!editDrive} onOpenChange={open => { if (!open) closeEdit(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit drive</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Name</label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                data-testid="input-edit-drive-name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Type</label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger data-testid="select-edit-drive-type"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {DRIVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Home venue</label>
              <Select value={editHomeVenueId} onValueChange={setEditHomeVenueId}>
                <SelectTrigger data-testid="select-edit-drive-venue"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {allVenues.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.depotName} · {v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={2}
                data-testid="input-edit-drive-notes"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Commission date</label>
              <Input
                type="date"
                value={editInstalledAt}
                onChange={e => setEditInstalledAt(e.target.value)}
                data-testid="input-edit-drive-installed-at"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                disabled={!editName || !editType || update.isPending}
                onClick={saveEdit}
                data-testid="btn-save-drive"
              >Save</Button>
              <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
