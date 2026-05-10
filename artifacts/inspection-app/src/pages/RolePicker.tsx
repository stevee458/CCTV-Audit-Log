import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Search, Wrench, LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

const ROLES = [
  {
    label: "Admin",
    description: "Manage users, drives, inspections and reports",
    icon: LayoutDashboard,
    path: "/admin",
    color: "text-primary",
    border: "hover:border-primary/50",
    bg: "hover:bg-primary/5",
  },
  {
    label: "Inspector",
    description: "Perform venue inspections and review footage",
    icon: Search,
    path: "/inspector",
    color: "text-blue-600",
    border: "hover:border-blue-400/50",
    bg: "hover:bg-blue-50",
  },
  {
    label: "Maintenance",
    description: "Manage drives, site visits and maintenance stock",
    icon: Wrench,
    path: "/maintenance",
    color: "text-amber-600",
    border: "hover:border-amber-400/50",
    bg: "hover:bg-amber-50/60",
  },
] as const;

export default function RolePicker() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { canInstall, install } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary flex items-center justify-between px-6 h-16 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/jarvie-logo.png" alt="Jarvie" className="h-9 w-auto brightness-0 invert" />
        </div>
        <div className="flex items-center gap-2">
          {canInstall && (
            <Button
              variant="ghost"
              size="sm"
              onClick={install}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Super Admin</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome, {user?.name}
          </h1>
          <p className="text-muted-foreground mt-2">Select the view you want to work in</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-2xl">
          {ROLES.map(({ label, description, icon: Icon, path, color, border, bg }) => (
            <button
              key={path}
              onClick={() => setLocation(path)}
              className={`flex flex-col items-center gap-4 p-7 rounded-2xl border-2 border-border bg-card transition-all duration-150 cursor-pointer shadow-sm ${border} ${bg} hover:shadow-md`}
            >
              <div className={`rounded-full p-3 bg-background border ${color === "text-primary" ? "border-primary/20" : color === "text-blue-600" ? "border-blue-200" : "border-amber-200"}`}>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground text-base">{label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
