import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CardsProvider } from "@/contexts/CardsContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { useIOSDeepLinkRestore } from "@/components/IOSPWAPrompt";
import { useAppLock } from "@/hooks/useAppLock";
import HomeRedirect from "./HomeRedirect";

import Index from "./pages/Index";
import Login from "./pages/Login";
import PublicCard from "./pages/PublicCard";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import MyCard from "./pages/MyCard";
import Settings from "./pages/Settings";
import OrderNFCCard from "./pages/OrderNFCCard";
import Admin from "./pages/Admin";
import Upgrade from "./pages/Upgrade";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Support from "./pages/Support";

import { createContext, useContext } from "react";

/* ---------------- Query Client ---------------- */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false,
    },
  },
});

/* ---------------- App Lock Context ---------------- */

export const AppLockContext = createContext<ReturnType<typeof useAppLock> | null>(
  null
);
export const useAppLockContext = () => useContext(AppLockContext);

function AppLockProvider({ children }: { children: React.ReactNode }) {
  const appLock = useAppLock();
  return (
    <AppLockContext.Provider value={appLock}>
      {children}
    </AppLockContext.Provider>
  );
}

/* ---------------- App Lock Guard ---------------- */

function AppWithLock({ children }: { children: React.ReactNode }) {
  const appLock = useAppLockContext();
  const location = useLocation();

  if (appLock?.isLocked && location.pathname !== "/login") {
    return (
      <Navigate
        to="/login"
        state={{ appLockMode: true, returnTo: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}

/* ---------------- Router ---------------- */

function RouterContent() {
  const { loading: authLoading } = useAuth();
  
  // Restore deep link path when iOS PWA opens
  useIOSDeepLinkRestore();

  // Show minimal loading indicator while auth initializes (prevents blank screen)
  if (authLoading) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/logos/synka-logo.png" alt="Synka" className="w-12 h-12 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root decision */}
      <Route path="/" element={<HomeRedirect />} />

      {/* -------- Public routes (NO Layout) -------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Public card - canonical URL */}
      <Route path="/u/:slug" element={<PublicCard />} />

      {/* -------- App routes (WITH Layout) -------- */}
      <Route element={<Layout />}>
        <Route path="/index" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/my-card" element={<MyCard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/profile" element={<ProfileSettings />} />
        <Route path="/settings/upgrade" element={<Upgrade />} />
        <Route path="/order-nfc-card" element={<OrderNFCCard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/* ---------------- App Root ---------------- */

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CardsProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <DeepLinkHandler>
                  <AppLockProvider>
                    <AppWithLock>
                      <RouterContent />
                    </AppWithLock>
                  </AppLockProvider>
                </DeepLinkHandler>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </CardsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
