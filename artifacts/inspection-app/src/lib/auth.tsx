import { createContext, useContext, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import type { User, UserRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { clearOfflineData } from "@/lib/offline/db";
import { clearPersistedQueryCache } from "@/lib/offline/persister";
import { clearStoredScope, ensureScopeForUser } from "@/lib/offline/scope";

interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  refetch: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
    }
  });

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // When the authenticated user changes (or first appears), make sure persisted
  // offline data belongs to them. If not, wipe to prevent cross-user leakage.
  useEffect(() => {
    if (user?.id !== undefined) {
      ensureScopeForUser(user.id).catch(() => {});
    }
  }, [user?.id]);

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: async () => {
        queryClient.removeQueries();
        await clearPersistedQueryCache();
        clearStoredScope();
        await clearOfflineData();
        window.location.replace("/login");
      }
    }
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      refetch,
      logout: () => logoutMutation.mutate()
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: ReactNode, 
  allowedRoles?: UserRole[] 
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (allowedRoles && user.role !== "super_admin" && !allowedRoles.includes(user.role)) {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation, allowedRoles]);

  if (isLoading || !user || (allowedRoles && user.role !== "super_admin" && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
