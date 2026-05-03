import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListStockSkus,
  useCreateStockSku,
  useListStockRequests,
  useRejectStockRequest,
  useCreateStockPurchase,
  useListStockPurchases,
  useAdjustStockSku,
  getListStockSkusQueryKey,
  getListStockRequestsQueryKey,
  getListStockPurchasesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { apiErrorMessage } from "@/lib/api-error";

export default function AdminStock() {
  const { data: skus } = useListStockSkus();
  const { data: requests } = useListStockRequests();
  const { data: purchases } = useListStockPurchases();
  const qc = useQueryClient();
  const { toast } = useToast();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListStockSkusQueryKey() });
    qc.invalidateQueries({ queryKey: getListStockRequestsQueryKey() });
    qc.invalidateQueries({ queryKey: getListStockPurchasesQueryKey() });
  };

  const [skuOpen, setSkuOpen] = useState(false);
  const [skuName, setSkuName] = useState("");
  const [skuKind, setSkuKind] = useState<"item" | "accessory">("item");
  const [skuCategory, setSkuCategory] = useState("");

  const createSku = useCreateStockSku({
    mutation: { onSuccess: () => { refresh(); toast({ title: "SKU created" }); setSkuOpen(false); setSkuName(""); setSkuCategory(""); }, onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }) },
  });
  const reject = useRejectStockRequest({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Rejected" }); }, onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }) },
  });
  const adjust = useAdjustStockSku({
    mutation: { onSuccess: () => { refresh(); toast({ title: "Stock adjusted" }); }, onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }) },
  });
  const [checkOpenFor, setCheckOpenFor] = useState<number | null>(null);
  const [checkCount, setCheckCount] = useState("");
  const [checkReason, setCheckReason] = useState("stock check");

  const [purchaseOpenFor, setPurchaseOpenFor] = useState<number | null>(null);
  const [pQty, setPQty] = useState("1");
  const [pCost, setPCost] = useState("0");
  const [pSupplier, setPSupplier] = useState("");
  const [pPo, setPPo] = useState("");

  const createPurchase = useCreateStockPurchase({
    mutation: {
      onSuccess: () => {
        refresh();
        toast({ title: "Purchase recorded" });
        setPurchaseOpenFor(null);
        setPQty("1"); setPCost("0"); setPSupplier(""); setPPo("");
      },
      onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }),
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests" data-testid="tab-requests">Requests</TabsTrigger>
            <TabsTrigger value="purchases" data-testid="tab-purchases">Purchases</TabsTrigger>
            <TabsTrigger value="skus" data-testid="tab-skus">SKUs</TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>By</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {requests?.map(r => (
                      <TableRow key={r.id} data-testid={`req-${r.id}`}>
                        <TableCell className="font-medium">{r.skuName}</TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell>{r.requesterName}</TableCell>
                        <TableCell><Badge>{r.status}</Badge></TableCell>
                        <TableCell className="space-x-1">
                          {r.status === "Requested" && (
                            <>
                              <Button size="sm" onClick={() => setPurchaseOpenFor(r.id)} data-testid={`btn-purchase-${r.id}`}>Purchase</Button>
                              <Button size="sm" variant="outline" onClick={() => reject.mutate({ id: r.id })} data-testid={`btn-reject-${r.id}`}>Reject</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="purchases">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {purchases?.map(p => (
                      <TableRow key={p.id} data-testid={`purchase-${p.id}`}>
                        <TableCell className="font-medium">{p.skuName}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell>${(p.totalCostCents / 100).toFixed(2)}</TableCell>
                        <TableCell>{p.supplier ?? "—"}</TableCell>
                        <TableCell>{p.collectedAt ? <Badge variant="secondary">Collected {format(new Date(p.collectedAt), "PP")}</Badge> : <Badge>Ordered</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="skus">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">SKUs</CardTitle>
                <Dialog open={skuOpen} onOpenChange={setSkuOpen}>
                  <DialogTrigger asChild><Button size="sm" data-testid="btn-new-sku"><Plus className="h-4 w-4 mr-1" />New</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New SKU</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="Name" value={skuName} onChange={e => setSkuName(e.target.value)} data-testid="input-sku-name" />
                      <Select value={skuKind} onValueChange={v => setSkuKind(v as "item" | "accessory")}>
                        <SelectTrigger data-testid="select-sku-kind"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="item">Item</SelectItem><SelectItem value="accessory">Accessory</SelectItem></SelectContent>
                      </Select>
                      <Input placeholder="Category (optional)" value={skuCategory} onChange={e => setSkuCategory(e.target.value)} data-testid="input-sku-category" />
                      <Button disabled={!skuName} onClick={() => createSku.mutate({ data: { name: skuName, kind: skuKind, category: skuCategory || null } })} data-testid="btn-create-sku">Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Kind</TableHead><TableHead>Category</TableHead><TableHead>On hand</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {skus?.map(s => (
                      <TableRow key={s.id} data-testid={`sku-${s.id}`}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.kind}</TableCell>
                        <TableCell>{s.category ?? "—"}</TableCell>
                        <TableCell>{s.onHand}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setCheckOpenFor(s.id); setCheckCount(String(s.onHand)); setCheckReason("stock check"); }}
                            data-testid={`btn-check-${s.id}`}
                          >Stock check</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={checkOpenFor !== null} onOpenChange={v => !v && setCheckOpenFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Stock check</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="number" placeholder="Counted" value={checkCount} onChange={e => setCheckCount(e.target.value)} data-testid="input-counted" />
              <Input placeholder="Reason" value={checkReason} onChange={e => setCheckReason(e.target.value)} data-testid="input-reason" />
              <Button
                disabled={!checkCount}
                onClick={() => { if (checkOpenFor) { adjust.mutate({ id: checkOpenFor, data: { counted: Number(checkCount), reason: checkReason || "stock check" } }); setCheckOpenFor(null); } }}
                data-testid="btn-confirm-check"
              >Apply</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={purchaseOpenFor !== null} onOpenChange={v => !v && setPurchaseOpenFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record purchase</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="number" placeholder="Quantity" value={pQty} onChange={e => setPQty(e.target.value)} data-testid="input-pqty" />
              <Input type="number" placeholder="Unit cost (cents)" value={pCost} onChange={e => setPCost(e.target.value)} data-testid="input-pcost" />
              <Input placeholder="Supplier" value={pSupplier} onChange={e => setPSupplier(e.target.value)} data-testid="input-psupplier" />
              <Input placeholder="PO ref" value={pPo} onChange={e => setPPo(e.target.value)} data-testid="input-ppo" />
              <Button
                disabled={!pQty || !pCost}
                onClick={() => purchaseOpenFor && createPurchase.mutate({ id: purchaseOpenFor, data: { quantity: Number(pQty), unitCostCents: Number(pCost), supplier: pSupplier || null, poRef: pPo || null } })}
                data-testid="btn-confirm-purchase"
              >Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
