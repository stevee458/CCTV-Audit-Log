import "./_group.css";
import { Wrench, UserSearch, ChevronRight, HardDrive, Package } from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 h-14 shadow-md"
        style={{ background: "#0f172a" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded"
            style={{ background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">Maintenance</span>
        </div>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          JB
        </div>
      </header>

      {/* Greeting */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>
          Good morning
        </p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: "#0f172a" }}>
          Jamie Brown
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Where are you working today?
        </p>
      </div>

      {/* Main action cards */}
      <div className="px-4 pt-4 flex flex-col gap-4 flex-1">

        {/* AT DEPOT */}
        <button
          className="w-full rounded-2xl overflow-hidden text-left group active:scale-[0.98] transition-transform"
          style={{
            background: "#0f172a",
            boxShadow: "0 4px 24px rgba(15,23,42,0.18)",
            border: "none",
          }}
        >
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(59,130,246,0.18)" }}
              >
                <Wrench className="h-6 w-6" style={{ color: "#60a5fa" }} />
              </div>
              <ChevronRight className="h-5 w-5 mt-1" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#60a5fa" }}>
              At Depot
            </p>
            <h2 className="text-xl font-bold text-white leading-tight">
              Start a Venue Visit
            </h2>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
              Log a scheduled maintenance visit, swap drives and record site work.
            </p>
          </div>
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
          >
            <HardDrive className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Drive swap · Site log · Stock</span>
          </div>
        </button>

        {/* AT INSPECTOR */}
        <button
          className="w-full rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
          style={{
            background: "#1e3a5f",
            boxShadow: "0 4px 24px rgba(30,58,95,0.22)",
            border: "none",
          }}
        >
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(34,197,94,0.18)" }}
              >
                <UserSearch className="h-6 w-6" style={{ color: "#4ade80" }} />
              </div>
              <ChevronRight className="h-5 w-5 mt-1" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#4ade80" }}>
              At Inspector
            </p>
            <h2 className="text-xl font-bold text-white leading-tight">
              Collect or Deliver a Drive
            </h2>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
              Hand over or receive drives directly with an Inspector in the field.
            </p>
          </div>
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
          >
            <Package className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Select Inspector · Scan drive · Confirm</span>
          </div>
        </button>
      </div>

      {/* Bottom nav stub */}
      <nav
        className="mt-6 grid grid-cols-4 border-t"
        style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}
      >
        {[
          { label: "Home", active: true },
          { label: "Drives", active: false },
          { label: "Visits", active: false },
          { label: "Stock", active: false },
        ].map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-center justify-center py-3 gap-0.5"
            style={{ color: t.active ? "#ffffff" : "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: t.active ? 600 : 400 }}
          >
            <div className="h-5 w-5 rounded bg-current opacity-60 mb-0.5" style={{ opacity: t.active ? 1 : 0.4 }} />
            {t.label}
          </div>
        ))}
      </nav>
    </div>
  );
}
