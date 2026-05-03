import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAssets, useCreateAsset, useListDepots, getListAssetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { Plus } from "lucide-react";

const ASSET_TYPES = ["DVR", "Camera", "Power Supply", "Hard Drive", "Cable"];

export default function AdminAssets() {
  const [search, setSearch] = useState("");
  const { data: assets } = useListAssets({ search: search || undefined });
  const { data: depots } = useListDepots();
  const venues = depots?.flatMap(d => d.venues.map(v => ({ ...v, depotName: d.name }))) ?? [];
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState("");
  const [type, setType] = useState("");
  const [label, setLabel] = useState("");
  const [serial, setSerial] = useState("");

  const create = useCreateAsset({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAssetsQueryKey() });
        toast({ title: "Asset created" });
        setOpen(false);
        setLabel(""); setSerial(""); setType(""); setVenueId("");
      },
      onError: e => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

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
                  <SelectContent>{venues.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.depotName} · {v.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-asset-type"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} data-testid="input-asset-label" />
                <Input placeholder="Serial (optional)" value={serial} onChange={e => setSerial(e.target.value)} data-testid="input-asset-serial" />
                <Button
                  disabled={!venueId || !type || !label}
                  onClick={() => create.mutate({ data: { venueId: Number(venueId), type, label, serial: serial || null } })}
                  data-testid="btn-create-asset"
                >Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader><Input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" data-testid="input-search-assets" /></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Venue</TableHead><TableHead>Status</TableHead><TableHead>Serial</TableHead></TableRow></TableHeader>
              <TableBody>
                {assets?.map(a => (
                  <TableRow key={a.id} data-testid={`row-asset-${a.id}`}>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>{a.venueName}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.serial ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
