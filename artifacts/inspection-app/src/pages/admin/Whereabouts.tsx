import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListDepots, useDriveWhereabouts, getDriveWhereaboutsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Whereabouts() {
  const { data: depots } = useListDepots();
  const [venueId, setVenueId] = useState("");
  const [datetime, setDatetime] = useState("");
  const [submitted, setSubmitted] = useState<{ v: number; d: string } | null>(null);
  const allVenues = depots?.flatMap(d => d.venues.map(v => ({ ...v, depotName: d.name }))) ?? [];

  const params = submitted ? { venueId: submitted.v, datetime: submitted.d } : { venueId: 0, datetime: "" };
  const { data: result, isLoading } = useDriveWhereabouts(
    params,
    { query: { enabled: !!submitted, queryKey: getDriveWhereaboutsQueryKey(params) } },
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Drive whereabouts</h1>
        <p className="text-sm text-muted-foreground">Find which drive holds the footage for a venue + date.</p>

        <Card>
          <CardHeader><CardTitle className="text-base">Lookup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger data-testid="select-venue"><SelectValue placeholder="Venue" /></SelectTrigger>
              <SelectContent>{allVenues.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.depotName} · {v.name} ({v.code})</SelectItem>)}</SelectContent>
            </Select>
            <Input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} data-testid="input-datetime" />
            <Button
              disabled={!venueId || !datetime}
              onClick={() => setSubmitted({ v: Number(venueId), d: new Date(datetime).toISOString() })}
              data-testid="btn-find"
            >Find</Button>
          </CardContent>
        </Card>

        {submitted && (
          <Card>
            <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <p className="text-sm text-muted-foreground">Searching...</p>}
              {result && result.matches.length === 0 && <p className="text-sm text-muted-foreground">No drive was at that venue at that time.</p>}
              {result?.matches.map(m => (
                <div key={m.windowId} className={`p-3 border rounded ${m.likelyOverwritten ? "opacity-60" : ""}`} data-testid={`match-${m.windowId}`}>
                  <div className="flex items-center justify-between">
                    <Link href={`/admin/drives/${m.driveId}`} className="font-medium hover:underline">{m.driveName}</Link>
                    <Badge>{m.driveStatus}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Holder: {m.holderName ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(m.installedAt), "PPp")} → {m.extractedAt ? format(new Date(m.extractedAt), "PPp") : "current"}</div>
                  {m.likelyOverwritten && <Badge variant="destructive" className="mt-1">Likely overwritten (&gt;60d)</Badge>}
                </div>
              ))}
              {result && result.inspections.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mt-3 mb-1">Related inspections</h4>
                  {result.inspections.map(i => (
                    <Link key={i.id} href={`/admin/inspections/${i.id}`} className="block text-sm p-2 border rounded mb-1 hover-elevate">
                      DVR {i.dvrNumber} · {format(new Date(i.footageDate), "PP")}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
