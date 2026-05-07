import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { LogOut, Home, PlusCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SyncStatus } from "@/components/offline/SyncStatus";

export function InspectorLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [_location] = useLocation();
  void _location;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-primary/20 bg-primary px-4 shadow-md">
        <Link href="/inspector" className="flex items-center gap-2 flex-1">
          <Logo className="h-8 w-auto brightness-0 invert" />
        </Link>

        <SyncStatus />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary-foreground/10">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground font-medium text-xs">{user ? getInitials(user.name) : 'I'}</AvatarFallback>
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
              <Link href="/inspector" className="cursor-pointer w-full flex items-center">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/inspector/new" className="cursor-pointer w-full flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Inspection
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

      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto">
        {children}
      </main>
    </div>
  );
}
