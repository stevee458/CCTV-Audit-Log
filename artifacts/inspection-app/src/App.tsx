import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { installOfflineSupport } from "@/lib/offline/install";
import { startSyncLoop, setSyncQueryClient } from "@/lib/offline/sync-runner";
import { createReactQueryPersister } from "@/lib/offline/persister";

import Login from "@/pages/Login";
import Home from "@/pages/Home";
import RolePicker from "@/pages/RolePicker";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminInspections from "@/pages/admin/InspectionsList";
import AdminInspectionDetail from "@/pages/admin/InspectionDetail";
import AdminUsers from "@/pages/admin/UsersList";
import AdminDrives from "@/pages/admin/Drives";
import AdminDriveDetail from "@/pages/admin/DriveDetail";
import DriveLabels from "@/pages/admin/DriveLabels";
import AdminAssets from "@/pages/admin/Assets";
import AdminStock from "@/pages/admin/Stock";
import AdminVisits from "@/pages/admin/Visits";
import AdminWhereabouts from "@/pages/admin/Whereabouts";
import InspectorDashboard from "@/pages/inspector/Dashboard";
import NewInspection from "@/pages/inspector/NewInspection";
import InspectionWorkspace from "@/pages/inspector/InspectionWorkspace";
import MyDrives from "@/pages/inspector/MyDrives";
import MaintenanceDashboard from "@/pages/maintenance/Dashboard";
import MaintenanceDrives from "@/pages/maintenance/Drives";
import MaintenanceDriveDetail from "@/pages/maintenance/DriveDetail";
import MaintenanceVisits from "@/pages/maintenance/Visits";
import NewMaintenanceVisit from "@/pages/maintenance/NewVisit";
import VisitDetail from "@/pages/maintenance/VisitDetail";
import MaintenanceStock from "@/pages/maintenance/Stock";
import NewStockRequest from "@/pages/maintenance/NewStockRequest";
import MaintenanceRequests from "@/pages/maintenance/Requests";

installOfflineSupport();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7,
      staleTime: 1000 * 30,
      networkMode: "offlineFirst",
      retry: false,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

const persister = createReactQueryPersister();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/"><ProtectedRoute><Home /></ProtectedRoute></Route>
      <Route path="/role-picker"><ProtectedRoute allowedRoles={["super_admin"]}><RolePicker /></ProtectedRoute></Route>

      <Route path="/admin"><ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminDashboard /></ProtectedRoute></Route>
      <Route path="/admin/inspections"><ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminInspections /></ProtectedRoute></Route>
      <Route path="/admin/inspections/:id"><ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminInspectionDetail /></ProtectedRoute></Route>
      <Route path="/admin/users"><ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminUsers /></ProtectedRoute></Route>
      <Route path="/admin/drives"><ProtectedRoute><AdminDrives /></ProtectedRoute></Route>
      <Route path="/admin/drives/labels"><ProtectedRoute><DriveLabels /></ProtectedRoute></Route>
      <Route path="/admin/drives/:id"><ProtectedRoute><AdminDriveDetail /></ProtectedRoute></Route>
      <Route path="/admin/assets"><ProtectedRoute><AdminAssets /></ProtectedRoute></Route>
      <Route path="/admin/stock"><ProtectedRoute><AdminStock /></ProtectedRoute></Route>
      <Route path="/admin/visits"><ProtectedRoute><AdminVisits /></ProtectedRoute></Route>
      <Route path="/admin/whereabouts"><ProtectedRoute><AdminWhereabouts /></ProtectedRoute></Route>

      <Route path="/inspector"><ProtectedRoute allowedRoles={["inspector", "super_admin"]}><InspectorDashboard /></ProtectedRoute></Route>
      <Route path="/inspector/new"><ProtectedRoute allowedRoles={["inspector", "super_admin"]}><NewInspection /></ProtectedRoute></Route>
      <Route path="/inspector/inspection/:id"><ProtectedRoute allowedRoles={["inspector", "super_admin"]}><InspectionWorkspace /></ProtectedRoute></Route>
      <Route path="/inspector/drives"><ProtectedRoute allowedRoles={["inspector", "super_admin"]}><MyDrives /></ProtectedRoute></Route>

      <Route path="/maintenance"><ProtectedRoute allowedRoles={["maintenance", "super_admin"]}><MaintenanceDashboard /></ProtectedRoute></Route>
      <Route path="/maintenance/drives"><ProtectedRoute><MaintenanceDrives /></ProtectedRoute></Route>
      <Route path="/maintenance/drives/:id"><ProtectedRoute><MaintenanceDriveDetail /></ProtectedRoute></Route>
      <Route path="/maintenance/visits"><ProtectedRoute><MaintenanceVisits /></ProtectedRoute></Route>
      <Route path="/maintenance/visits/new"><ProtectedRoute allowedRoles={["maintenance", "super_admin"]}><NewMaintenanceVisit /></ProtectedRoute></Route>
      <Route path="/maintenance/visits/:id"><ProtectedRoute><VisitDetail /></ProtectedRoute></Route>
      <Route path="/maintenance/stock"><ProtectedRoute><MaintenanceStock /></ProtectedRoute></Route>
      <Route path="/maintenance/requests"><ProtectedRoute><MaintenanceRequests /></ProtectedRoute></Route>
      <Route path="/maintenance/requests/new"><ProtectedRoute allowedRoles={["maintenance", "super_admin"]}><NewStockRequest /></ProtectedRoute></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function SyncBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setSyncQueryClient(queryClient);
    const stop = startSyncLoop();
    return () => {
      stop();
      setSyncQueryClient(null);
    };
  }, []);
  return <>{children}</>;
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success",
        },
      }}
    >
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <SyncBootstrap>
              <OfflineBanner />
              <Router />
            </SyncBootstrap>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
