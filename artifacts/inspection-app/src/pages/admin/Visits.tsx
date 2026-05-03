import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListMaintenanceVisits, useListRepairs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AdminVisits() {
  const { data: visits } = useListMaintenanceVisits();
  const { data: repairs } = useListRepairs();
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
        <Tabs defaultValue="visits">
          <TabsList>
            <TabsTrigger value="visits" data-testid="tab-visits">Visits</TabsTrigger>
            <TabsTrigger value="repairs" data-testid="tab-repairs">Repairs</TabsTrigger>
          </TabsList>
          <TabsContent value="visits">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Depot</TableHead><TableHead>Maintainer</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {visits?.map(v => (
                      <TableRow key={v.id} data-testid={`visit-${v.id}`}>
                        <TableCell>{format(new Date(v.visitDate), "PP")}</TableCell>
                        <TableCell className="font-medium">{v.depotName}</TableCell>
                        <TableCell>{v.maintainerName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="repairs">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Venue</TableHead><TableHead>Action</TableHead><TableHead>Asset</TableHead><TableHead>Parts</TableHead><TableHead>Labour</TableHead><TableHead>Charge</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {repairs?.map(r => (
                      <TableRow key={r.id} data-testid={`repair-${r.id}`}>
                        <TableCell>{format(new Date(r.occurredAt), "PP")}</TableCell>
                        <TableCell>{r.venueName}</TableCell>
                        <TableCell>{r.action}</TableCell>
                        <TableCell>{r.assetLabel ?? "—"}</TableCell>
                        <TableCell>${(r.partsCostCents/100).toFixed(2)}</TableCell>
                        <TableCell>${(r.labourCostCents/100).toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${(r.clientChargeCents/100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
