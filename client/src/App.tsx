import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import ModeSelection from "@/pages/mode-selection";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AwaitingConsent from "@/pages/awaiting-consent";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import FacilitatorDashboard from "@/pages/facilitator-dashboard";
import ChildProfile from "@/pages/child-profile";
import NewEntry from "@/pages/new-entry";
import PlantProfile from "@/pages/plant-profile";
import Achievements from "@/pages/achievements";
import SeedVault from "@/pages/seed-vault";
import Store from "@/pages/store";
import Help from "@/pages/help";
import { useStorage, useStorageWithNotifications } from "@/hooks/use-storage";
import { useEffect } from "react";
import AppHeader from "@/components/app-header";
import FloatingOpcionIcon from "@/components/floating-opcion-icon";

// COPPA Route Guard Component - Critical security protection
function ProtectedRoute({ component: Component, showHeader = false }: { component: React.ComponentType<any>, showHeader?: boolean }) {
  const { currentUser } = useStorage();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // No user logged in - redirect to welcome
    if (!currentUser) {
      setLocation('/welcome');
      return;
    }

    // Child without verified consent - redirect to awaiting consent
    if (currentUser.role === 'child' && !currentUser.consentVerified) {
      console.warn('COPPA: Blocking unverified child from protected route');
      setLocation('/awaiting-consent');
      return;
    }
  }, [currentUser, setLocation]);

  // Show loading state during redirect
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Child without verified consent - show loading during redirect
  if (currentUser.role === 'child' && !currentUser.consentVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos...</div>
      </div>
    );
  }

  // User is verified or not a child - allow access
  return (
    <>
      {showHeader && <AppHeader title="Semillita" variant="gradient" />}
      <Component />
    </>
  );
}

function Router() {
  const { currentUser } = useStorage();

  return (
    <Switch>
      {/* Public routes - no protection needed */}
      <Route path="/">
        {currentUser ? <ProtectedRoute component={Dashboard} /> : <Welcome />}
      </Route>
      <Route path="/welcome" component={Welcome} />
      <Route path="/mode-selection" component={ModeSelection} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/awaiting-consent" component={AwaitingConsent} />
      <Route path="/help" component={Help} />
      
      {/* PROTECTED routes - require verified consent for children */}
      <Route path="/onboarding">
        <ProtectedRoute component={Onboarding} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/new-entry">
        <ProtectedRoute component={NewEntry} />
      </Route>
      <Route path="/plant">
        <ProtectedRoute component={PlantProfile} />
      </Route>
      <Route path="/achievements">
        <ProtectedRoute component={Achievements} />
      </Route>
      <Route path="/seed-vault">
        <ProtectedRoute component={SeedVault} showHeader={false} />
      </Route>
      <Route path="/store">
        <ProtectedRoute component={Store} />
      </Route>

      {/* Facilitator routes */}
      <Route path="/facilitator/dashboard">
        <ProtectedRoute component={FacilitatorDashboard} />
      </Route>
      <Route path="/facilitator/child/:id">
        <ProtectedRoute component={ChildProfile} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { requestNotificationPermission } = useStorageWithNotifications();

  useEffect(() => {
    // Request notification permission on app load
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="max-w-md mx-auto bg-card shadow-xl min-h-screen relative">
          <Router />
          <FloatingOpcionIcon />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
