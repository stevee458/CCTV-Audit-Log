import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import type { User, UserRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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
  
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/login");
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
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation, allowedRoles]);

  if (isLoading || !user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null; // Or a full-screen loading skeleton
  }

  return <>{children}</>;
}
