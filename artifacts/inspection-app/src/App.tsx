import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

import Login from "@/pages/Login";
import Home from "@/pages/Home";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminInspections from "@/pages/admin/InspectionsList";
import AdminInspectionDetail from "@/pages/admin/InspectionDetail";
import AdminUsers from "@/pages/admin/UsersList";
import AdminDrives from "@/pages/admin/Drives";
import AdminDriveDetail from "@/pages/admin/DriveDetail";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/"><ProtectedRoute><Home /></ProtectedRoute></Route>

      <Route path="/admin"><ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute></Route>
      <Route path="/admin/inspections"><ProtectedRoute allowedRoles={["admin"]}><AdminInspections /></ProtectedRoute></Route>
      <Route path="/admin/inspections/:id"><ProtectedRoute allowedRoles={["admin"]}><AdminInspectionDetail /></ProtectedRoute></Route>
      <Route path="/admin/users"><ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute></Route>
      <Route path="/admin/drives"><ProtectedRoute><AdminDrives /></ProtectedRoute></Route>
      <Route path="/admin/drives/:id"><ProtectedRoute><AdminDriveDetail /></ProtectedRoute></Route>
      <Route path="/admin/assets"><ProtectedRoute><AdminAssets /></ProtectedRoute></Route>
      <Route path="/admin/stock"><ProtectedRoute><AdminStock /></ProtectedRoute></Route>
      <Route path="/admin/visits"><ProtectedRoute><AdminVisits /></ProtectedRoute></Route>
      <Route path="/admin/whereabouts"><ProtectedRoute><AdminWhereabouts /></ProtectedRoute></Route>

      <Route path="/inspector"><ProtectedRoute allowedRoles={["inspector"]}><InspectorDashboard /></ProtectedRoute></Route>
      <Route path="/inspector/new"><ProtectedRoute allowedRoles={["inspector"]}><NewInspection /></ProtectedRoute></Route>
      <Route path="/inspector/inspection/:id"><ProtectedRoute allowedRoles={["inspector"]}><InspectionWorkspace /></ProtectedRoute></Route>
      <Route path="/inspector/drives"><ProtectedRoute allowedRoles={["inspector"]}><MyDrives /></ProtectedRoute></Route>

      <Route path="/maintenance"><ProtectedRoute allowedRoles={["maintenance"]}><MaintenanceDashboard /></ProtectedRoute></Route>
      <Route path="/maintenance/drives"><ProtectedRoute><MaintenanceDrives /></ProtectedRoute></Route>
      <Route path="/maintenance/drives/:id"><ProtectedRoute><MaintenanceDriveDetail /></ProtectedRoute></Route>
      <Route path="/maintenance/visits"><ProtectedRoute><MaintenanceVisits /></ProtectedRoute></Route>
      <Route path="/maintenance/visits/new"><ProtectedRoute allowedRoles={["maintenance"]}><NewMaintenanceVisit /></ProtectedRoute></Route>
      <Route path="/maintenance/visits/:id"><ProtectedRoute><VisitDetail /></ProtectedRoute></Route>
      <Route path="/maintenance/stock"><ProtectedRoute><MaintenanceStock /></ProtectedRoute></Route>
      <Route path="/maintenance/requests"><ProtectedRoute><MaintenanceRequests /></ProtectedRoute></Route>
      <Route path="/maintenance/requests/new"><ProtectedRoute allowedRoles={["maintenance"]}><NewStockRequest /></ProtectedRoute></Route>

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
