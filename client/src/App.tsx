import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Alerts from "@/pages/alerts";
import RiskAnalysis from "@/pages/risk-analysis";
import EntityNetwork from "@/pages/entity-network";
import Cases from "@/pages/cases";
import Investigations from "@/pages/investigations";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import MlModels from "@/pages/ml-models";
import Admin from "@/pages/admin";
import { AuthProvider } from "@/context/auth-context";
import { DashboardProvider } from "@/context/dashboard-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/risk-analysis" component={RiskAnalysis} />
      <Route path="/entity-network" component={EntityNetwork} />
      <Route path="/cases" component={Cases} />
      <Route path="/investigations" component={Investigations} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route path="/ml-models" component={MlModels} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DashboardProvider>
          <Router />
          <Toaster />
        </DashboardProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
