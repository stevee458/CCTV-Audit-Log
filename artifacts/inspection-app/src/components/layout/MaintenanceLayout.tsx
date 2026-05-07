import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { LogOut, Home, HardDrive, Wrench, Package, ClipboardList, ArrowLeftRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SyncStatus } from "@/components/offline/SyncStatus";

export function MaintenanceLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const tabs = [
    { href: "/maintenance", label: "Home", icon: Home },
    { href: "/maintenance/drives", label: "Drives", icon: HardDrive },
    { href: "/maintenance/visits", label: "Visits", icon: Wrench },
    { href: "/maintenance/stock", label: "Stock", icon: Package },
  ];

  const initials = (n: string) => n.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-primary/20 bg-primary px-4 shadow-md">
        <Link href="/maintenance" className="flex items-center gap-2 flex-1">
          <Logo className="h-8 w-auto brightness-0 invert" />
          <span className="font-semibold text-sm hidden sm:inline text-primary-foreground">Maintenance</span>
        </Link>
        <SyncStatus />
        {user?.role === "super_admin" && (
          <Button variant="ghost" size="sm" asChild className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/role-picker">
              <ArrowLeftRight className="h-4 w-4 mr-1.5" />
              Switch view
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary-foreground/10">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground text-xs font-medium">
                  {user ? initials(user.name) : "M"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/maintenance/requests" className="cursor-pointer w-full flex items-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                My Requests
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto pb-16">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-primary/20 bg-primary grid grid-cols-4">
        {tabs.map((t) => {
          const active = location === t.href || (t.href !== "/maintenance" && location.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors ${
                active ? "text-primary-foreground font-semibold" : "text-primary-foreground/50 hover:text-primary-foreground/80"
              }`}
              data-testid={`tab-${t.label.toLowerCase()}`}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
