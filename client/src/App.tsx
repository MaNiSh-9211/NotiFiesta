import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotificationConsent from "@/pages/notification-consent";
import NotFound from "@/pages/not-found";

// Debug component to help diagnose routing issues
function RouteDebugger() {
  const [location] = useLocation();
  console.log("Wouter location:", location);
  console.log("Window location:", window.location.pathname);
  
  return null;
}

function Router() {
  console.log("Current path:", window.location.pathname);
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/notify/:linkId" component={NotificationConsent} />
      <Route path="/login" component={Login} />
      <Route path="/" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-black text-white">
          <Toaster />
          <RouteDebugger />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
