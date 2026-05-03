import { Link } from "wouter";
import { useState } from "react";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import {
  useListStockSkus,
  useListStockPurchases,
  useCollectStockPurchase,
  useAdjustStockSku,
  getListStockSkusQueryKey,
  getListStockPurchasesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export default function MaintenanceStock() {
  const { data: skus } = useListStockSkus();
  const { data: purchases } = useListStockPurchases();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [adjusting, setAdjusting] = useState<Record<number, string>>({});

  const collect = useCollectStockPurchase({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListStockPurchasesQueryKey() }); qc.invalidateQueries({ queryKey: getListStockSkusQueryKey() }); toast({ title: "Collected" }); }, onError: e => toast({ title: "Failed", description: (e.data as any)?.error, variant: "destructive" }) },
  });
  const adjust = useAdjustStockSku({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListStockSkusQueryKey() }); toast({ title: "Adjusted" }); }, onError: e => toast({ title: "Failed", description: (e.data as any)?.error, variant: "destructive" }) },
  });

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
          <Button asChild data-testid="btn-new-request"><Link href="/maintenance/requests/new"><Plus className="h-4 w-4 mr-1" />Request</Link></Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Pending purchases</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {purchases?.filter(p => !p.collectedAt).length === 0 && <p className="text-sm text-muted-foreground">Nothing to collect.</p>}
            {purchases?.filter(p => !p.collectedAt).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded" data-testid={`purchase-${p.id}`}>
                <div>
                  <div className="font-medium">{p.skuName}</div>
                  <div className="text-xs text-muted-foreground">qty {p.quantity} · {p.supplier ?? ""} {p.poRef ? `· ${p.poRef}` : ""}</div>
                </div>
                <Button size="sm" onClick={() => collect.mutate({ id: p.id })} data-testid={`btn-collect-${p.id}`}>Collect</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Stock on hand</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {skus?.map(s => (
              <div key={s.id} className="p-3 border rounded space-y-2" data-testid={`sku-${s.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.kind} {s.category ? `· ${s.category}` : ""}</div>
                  </div>
                  <Badge variant="secondary" className="text-base">{s.onHand}</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Counted"
                    value={adjusting[s.id] ?? ""}
                    onChange={e => setAdjusting({ ...adjusting, [s.id]: e.target.value })}
                    data-testid={`input-count-${s.id}`}
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!adjusting[s.id]}
                    onClick={() => { adjust.mutate({ id: s.id, data: { counted: Number(adjusting[s.id]), reason: "stock check" } }); setAdjusting({ ...adjusting, [s.id]: "" }); }}
                    data-testid={`btn-adjust-${s.id}`}
                  >Adjust</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
