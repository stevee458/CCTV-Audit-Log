import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import {
  useListStockSkus,
  useListStockPurchases,
  useCollectStockPurchase,
  getListStockSkusQueryKey,
  getListStockPurchasesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { Plus } from "lucide-react";

export default function MaintenanceStock() {
  const { data: skus } = useListStockSkus();
  const { data: purchases } = useListStockPurchases();
  const qc = useQueryClient();
  const { toast } = useToast();

  const collect = useCollectStockPurchase({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListStockPurchasesQueryKey() }); qc.invalidateQueries({ queryKey: getListStockSkusQueryKey() }); toast({ title: "Collected" }); }, onError: (e) => toast({ title: "Failed", description: apiErrorMessage(e), variant: "destructive" }) },
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
              <div key={s.id} className="p-3 border rounded flex items-center justify-between" data-testid={`sku-${s.id}`}>
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.kind} {s.category ? `· ${s.category}` : ""}</div>
                </div>
                <Badge variant="secondary" className="text-base">{s.onHand}</Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Stock counts are adjusted by Admin in the Stock check.</p>
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
