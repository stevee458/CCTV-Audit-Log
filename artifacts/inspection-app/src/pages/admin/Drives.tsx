import { Link } from "wouter";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListDrives } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDrives() {
  const [search, setSearch] = useState("");
  const { data } = useListDrives({ search: search || undefined });
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Drives</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All drives</CardTitle>
            <Input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" data-testid="input-search" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Drive</TableHead><TableHead>Type</TableHead><TableHead>Home venue</TableHead><TableHead>Status</TableHead><TableHead>Holder</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map(d => (
                  <TableRow key={d.id} data-testid={`row-drive-${d.id}`}>
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
