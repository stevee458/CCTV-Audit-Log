import "./_group.css";
import { Wrench, ChevronLeft, ChevronDown, ArrowDownToLine, ArrowUpFromLine, ScanLine, CheckCircle2 } from "lucide-react";

const INSPECTORS = [
  { id: 1, name: "Alex Carter", initials: "AC", active: true },
  { id: 2, name: "Dana Osei", initials: "DO", active: false },
  { id: 3, name: "Sam Patel", initials: "SP", active: false },
];

export function InspectorFlow() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 h-14 shadow-md"
        style={{ background: "#0f172a" }}
      >
        <button className="flex items-center justify-center h-8 w-8 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Wrench className="h-4 w-4" style={{ color: "#60a5fa" }} />
          <span className="text-white font-semibold text-sm">At Inspector</span>
        </div>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          JB
        </div>
      </header>

      <div className="flex-1 px-4 pt-5 pb-6 flex flex-col gap-5">

        {/* Step 1 — Inspector Selection */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "#3b82f6", flexShrink: 0 }}
            >
              1
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
              Select Inspector
            </h2>
          </div>

          {/* Dropdown (shown open / selected state) */}
          <div className="rounded-xl overflow-hidden" style={{ border: "2px solid #3b82f6", background: "#fff" }}>
            {/* Selected value row */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "#1e3a5f" }}
                >
                  AC
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Alex Carter</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>Inspector</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4" style={{ color: "#94a3b8" }} />
            </div>
            {/* Dropdown list open */}
            <div style={{ borderTop: "1px solid #e2e8f0" }}>
              {INSPECTORS.map((insp) => (
                <div
                  key={insp.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: insp.active ? "#eff6ff" : "#fff",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: insp.active ? "#3b82f6" : "#94a3b8" }}
                  >
                    {insp.initials}
                  </div>
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: insp.active ? "#1d4ed8" : "#475569" }}
                  >
                    {insp.name}
                  </span>
                  {insp.active && (
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#3b82f6" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2 — Direction of movement */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "#3b82f6", flexShrink: 0 }}
            >
              2
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
              What are you doing?
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {/* COLLECT */}
            <button
              className="w-full rounded-2xl p-5 text-left active:scale-[0.98] transition-transform"
              style={{
                background: "#0f172a",
                border: "2px solid #22c55e",
                boxShadow: "0 2px 16px rgba(34,197,94,0.15)",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.15)" }}
                >
                  <ArrowDownToLine className="h-6 w-6" style={{ color: "#4ade80" }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#4ade80" }}>
                    Collect
                  </p>
                  <p className="text-base font-bold text-white leading-tight">
                    Receive drive FROM Inspector
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Inspector → You
                  </p>
                </div>
              </div>
            </button>

            {/* DELIVER */}
            <button
              className="w-full rounded-2xl p-5 text-left active:scale-[0.98] transition-transform"
              style={{
                background: "#0f172a",
                border: "2px solid #f59e0b",
                boxShadow: "0 2px 16px rgba(245,158,11,0.12)",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)" }}
                >
                  <ArrowUpFromLine className="h-6 w-6" style={{ color: "#fbbf24" }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#fbbf24" }}>
                    Deliver
                  </p>
                  <p className="text-base font-bold text-white leading-tight">
                    Hand drive TO Inspector
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    You → Inspector
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Step 3 — Scan hint (greyed out until direction chosen) */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#e2e8f0", color: "#94a3b8", flexShrink: 0 }}
            >
              3
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#cbd5e1" }}>
              Scan Drive QR
            </h2>
          </div>

          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: "#f1f5f9", border: "2px dashed #cbd5e1", opacity: 0.6 }}
          >
            <ScanLine className="h-8 w-8" style={{ color: "#94a3b8" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#94a3b8" }}>Select action above first</p>
              <p className="text-xs mt-0.5" style={{ color: "#cbd5e1" }}>Then scan the QR label on the drive</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
