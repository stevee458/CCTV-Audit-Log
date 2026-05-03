import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.role === "admin") {
      setLocation("/admin");
    } else if (user?.role === "inspector") {
      setLocation("/inspector");
    } else if (user?.role === "maintenance") {
      setLocation("/maintenance");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-primary/20"></div>
        <p className="text-sm text-muted-foreground">Routing...</p>
      </div>
    </div>
  );
}
