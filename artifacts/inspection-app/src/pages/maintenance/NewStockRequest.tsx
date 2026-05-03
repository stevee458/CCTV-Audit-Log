import { useState } from "react";
import { useLocation } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useListStockSkus, useCreateStockRequest, getListStockRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function NewStockRequest() {
  const [, setLocation] = useLocation();
  const { data: skus } = useListStockSkus();
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useCreateStockRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStockRequestsQueryKey() });
        toast({ title: "Request submitted" });
        setLocation("/maintenance/requests");
      },
      onError: (e) => toast({ title: "Failed", description: (e.data as any)?.error, variant: "destructive" }),
    },
  });

  return (
    <MaintenanceLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/maintenance/stock")} className="-ml-3"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card>
          <CardHeader><CardTitle>Request stock</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={skuId} onValueChange={setSkuId}>
              <SelectTrigger data-testid="select-sku"><SelectValue placeholder="Item" /></SelectTrigger>
              <SelectContent>{skus?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} (on hand {s.onHand})</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} data-testid="input-qty" />
            <Textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} data-testid="input-reason" />
            <Button
              disabled={!skuId || create.isPending}
              onClick={() => create.mutate({ data: { skuId: Number(skuId), quantity: Number(qty), reason: reason || null } })}
              data-testid="btn-submit"
            >Submit request</Button>
          </CardContent>
        </Card>
      </div>
    </MaintenanceLayout>
  );
}
