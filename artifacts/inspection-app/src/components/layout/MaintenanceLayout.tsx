import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { LogOut, Home, HardDrive, Wrench, Package, ClipboardList } from "lucide-react";
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
    <div className="min-h-[100dvh] bg-muted/10 flex flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 shadow-sm">
        <Link href="/maintenance" className="flex items-center gap-2 flex-1">
          <Logo className="h-8 w-auto" />
          <span className="font-semibold text-sm hidden sm:inline">Maintenance</span>
        </Link>
        <SyncStatus />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
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

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background grid grid-cols-4">
        {tabs.map((t) => {
          const active = location === t.href || (t.href !== "/maintenance" && location.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center py-2 text-xs gap-0.5 ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
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
