import { Link } from "wouter";
import { MaintenanceLayout } from "@/components/layout/MaintenanceLayout";
import { useAuth } from "@/lib/auth";
import { Wrench, UserSearch, ChevronRight, HardDrive, Package } from "lucide-react";

export default function MaintenanceDashboard() {
  const { user } = useAuth();

  return (
    <MaintenanceLayout>
      <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
        {/* Greeting */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Where are you today?
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">
            {user?.name?.split(" ")[0] ?? "Welcome"}
          </h1>
        </div>

        {/* AT DEPOT */}
        <Link href="/maintenance/visits/new" className="block">
          <div
            className="w-full rounded-2xl overflow-hidden text-left"
            style={{ background: "hsl(var(--primary))" }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(59,130,246,0.2)" }}
                >
                  <Wrench className="h-6 w-6 text-blue-400" />
                </div>
                <ChevronRight className="h-5 w-5 mt-1 text-primary-foreground/40" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">At Depot</p>
              <h2 className="text-xl font-bold text-primary-foreground leading-tight">Start a Venue Visit</h2>
              <p className="text-sm mt-2 text-primary-foreground/55">
                Log a scheduled maintenance visit, swap drives and record site work.
              </p>
            </div>
            <div
              className="px-5 py-3 flex items-center gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
            >
              <HardDrive className="h-3.5 w-3.5 text-primary-foreground/40" />
              <span className="text-xs text-primary-foreground/40">Drive swap · Site log · Stock</span>
            </div>
          </div>
        </Link>

        {/* AT INSPECTOR */}
        <Link href="/maintenance/inspector-handover" className="block">
          <div
            className="w-full rounded-2xl overflow-hidden text-left"
            style={{ background: "#1e3a5f" }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(34,197,94,0.18)" }}
                >
                  <UserSearch className="h-6 w-6 text-green-400" />
                </div>
                <ChevronRight className="h-5 w-5 mt-1 text-white/40" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-1">At Inspector</p>
              <h2 className="text-xl font-bold text-white leading-tight">Collect or Deliver a Drive</h2>
              <p className="text-sm mt-2 text-white/55">
                Hand over or receive drives directly with an Inspector in the field.
              </p>
            </div>
            <div
              className="px-5 py-3 flex items-center gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
            >
              <Package className="h-3.5 w-3.5 text-white/40" />
              <span className="text-xs text-white/40">Select Inspector · Scan drive · Confirm</span>
            </div>
          </div>
        </Link>
      </div>
    </MaintenanceLayout>
  );
}
