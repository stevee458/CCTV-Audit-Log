import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, Search, Users, Menu, HardDrive, Wrench, Package, MapPin, Boxes, ArrowLeftRight, Download, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SyncStatus } from "@/components/offline/SyncStatus";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { HelpSheet } from "@/components/HelpSheet";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { canInstall, install } = useInstallPrompt();

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/inspections", label: "Inspections", icon: Search },
    { href: "/admin/drives", label: "Drives", icon: HardDrive },
    { href: "/admin/whereabouts", label: "Whereabouts", icon: MapPin },
    { href: "/admin/assets", label: "Assets", icon: Boxes },
    { href: "/admin/stock", label: "Stock", icon: Package },
    { href: "/admin/visits", label: "Maintenance", icon: Wrench },
    { href: "/admin/depots", label: "Depots", icon: Building2 },
    { href: "/admin/users", label: "Team", icon: Users },
  ];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-primary/20 bg-primary px-4 md:px-6 shadow-md">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 md:hidden text-primary-foreground hover:bg-primary-foreground/10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px] bg-primary border-primary/20">
            <nav className="grid gap-6 text-lg font-medium mt-6">
              <Link href="/admin" className="flex items-center gap-2">
                <Logo className="h-9 w-auto brightness-0 invert" />
              </Link>
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-4 px-2.5 transition-colors ${
                      isActive ? "text-primary-foreground font-bold" : "text-primary-foreground/60 hover:text-primary-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/admin" className="hidden md:flex items-center gap-2 mr-6">
          <Logo className="h-9 w-auto brightness-0 invert" />
        </Link>

        <nav className="hidden md:flex flex-1 items-center gap-4 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={`transition-colors flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "text-primary-foreground font-semibold"
                        : "text-primary-foreground/60 hover:text-primary-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 ml-auto">
          <SyncStatus />
          <HelpSheet role="admin" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary-foreground/10">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground font-medium">{user ? getInitials(user.name) : 'A'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.role === "super_admin" && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/role-picker" className="flex items-center w-full">
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Switch view
                  </Link>
                </DropdownMenuItem>
              )}
              {canInstall && (
                <DropdownMenuItem onClick={install} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Install App
                </DropdownMenuItem>
              )}
              {(user?.role === "super_admin" || canInstall) && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
