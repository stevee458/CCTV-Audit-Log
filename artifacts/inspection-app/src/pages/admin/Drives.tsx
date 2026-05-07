import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListDrives } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";

export default function AdminDrives() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { data } = useListDrives({ search: search || undefined });
  const [, navigate] = useLocation();

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
                    <TableCell><Badge>{d.status}</Badge></TableCell>
                    <TableCell>{d.holderName ?? "—"}</TableCell>
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
