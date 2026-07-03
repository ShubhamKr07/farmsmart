import { useEffect } from "react";
import { useAuth, SignIn } from "@clerk/clerk-react";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout/AppLayout";
import { Overview } from "@/pages/overview/Overview";
import { Cycles } from "@/pages/cycles/Cycles";
import { Inventory } from "@/pages/inventory/Inventory";
import { Shipments } from "@/pages/shipments/Shipments";
import { Layout } from "@/pages/layout/Layout";
import { Profile } from "@/pages/profile/Profile";
import { Settings } from "@/pages/settings/Settings";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBaseUrl) setBaseUrl(apiBaseUrl);

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/cycles" component={Cycles} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/shipments" component={Shipments} />
        <Route path="/layout" component={Layout} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

/**
 * Wires the Clerk session token into the shared API client so every request
 * carries `Authorization: Bearer <token>`. The server's `clerkMiddleware`
 * validates it. Re-registers the getter when the auth state changes.
 */
function ClerkAuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(async () => (await getToken()) ?? null);
  }, [getToken]);
  return null;
}

/** Shows Clerk's sign-in screen until the user is authenticated. */
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="h-[100dvh] flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!isSignedIn) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <SignIn />
      </div>
    );
  }
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ClerkAuthBridge />
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
