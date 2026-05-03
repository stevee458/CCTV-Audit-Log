import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

// Pages
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminInspections from "@/pages/admin/InspectionsList";
import AdminInspectionDetail from "@/pages/admin/InspectionDetail";
import AdminUsers from "@/pages/admin/UsersList";
import InspectorDashboard from "@/pages/inspector/Dashboard";
import NewInspection from "@/pages/inspector/NewInspection";
import InspectionWorkspace from "@/pages/inspector/InspectionWorkspace";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/inspections">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminInspections />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/inspections/:id">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminInspectionDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminUsers />
        </ProtectedRoute>
      </Route>

      {/* Inspector Routes */}
      <Route path="/inspector">
        <ProtectedRoute allowedRoles={["inspector"]}>
          <InspectorDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/inspector/new">
        <ProtectedRoute allowedRoles={["inspector"]}>
          <NewInspection />
        </ProtectedRoute>
      </Route>
      <Route path="/inspector/inspection/:id">
        <ProtectedRoute allowedRoles={["inspector"]}>
          <InspectionWorkspace />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
