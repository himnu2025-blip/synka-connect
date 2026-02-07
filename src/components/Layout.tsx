import { useEffect, useCallback, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';
import { ThemeToggle } from './ThemeToggle';
import { CardSelector } from './CardSelector';
import { BrandLogo } from './BrandLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileLanding } from './mobile/MobileLanding';
import { BiometricConsentDialog } from './mobile/BiometricConsentDialog';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { FirstLoginGuide } from './FirstLoginGuide';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useProfile } from '@/hooks/useProfile';
import { useBiometricAutoLogin } from '@/hooks/useBiometricAutoLogin';

// Get skeleton variant based on route
const getSkeletonVariant = (pathname: string) => {
  if (pathname.includes('/my-card') || pathname.includes('/card')) return 'card';
  if (pathname.includes('/crm')) return 'crm';
  if (pathname.includes('/settings')) return 'settings';
  return 'dashboard';
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const isOrangePlan = profile?.plan?.toLowerCase() === 'orange';
  const isNative = Capacitor.isNativePlatform();

  // Biometric auto-login hook (native only)
  const {
    biometricInfo,
    isBiometricLoading,
    showConsentDialog,
    setShowConsentDialog,
    triggerBiometricLogin,
    handleConsentEnable,
    handleConsentSkip,
  } = useBiometricAutoLogin();

  const {
    cards,
    activeCard,
    loading: cardsLoading,
    createCard,
    deleteCard,
    setDefaultCard,
    selectCard,
    updateCard
  } = useCards();

  const handleUpdateCardName = useCallback(async (cardId: string, name: string) => {
    await updateCard(cardId, { name });
  }, [updateCard]);

  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/signup';

  const isLandingPage = location.pathname === '/' || location.pathname === '/index';

  const isMyCardPage =
    location.pathname === '/my-card' || location.pathname.startsWith('/card');

  const isAuthenticated = !authLoading && !!user;

  const handleSelectCard = useCallback(async (cardId: string) => {
    if (!cardId) return;
    await selectCard(cardId);
    if (!isMyCardPage) navigate('/my-card');
  }, [selectCard, navigate, isMyCardPage]);

  const handleEditCard = useCallback(() => {
    navigate('/my-card?edit=true');
  }, [navigate]);

  const handleCreateCard = useCallback(async (name: string) => {
    const result = await createCard(name);
    if (result.data) {
      await selectCard(result.data.id);
      navigate('/my-card?edit=true');
    }
    return result;
  }, [createCard, selectCard, navigate]);

  const protectedRoutes = ['/dashboard', '/crm', '/my-card', '/card', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route =>
    location.pathname.startsWith(route)
  );

  useEffect(() => {
    if (!authLoading && !user && isProtectedRoute) {
      navigate('/login');
    }
  }, [authLoading, user, isProtectedRoute, navigate]);

  /* ---------------- AUTH PAGES ---------------- */
  if (isAuthPage) {
    return (
      <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-background">
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50">
          <ThemeToggle />
        </div>
        <Outlet />
      </div>
    );
  }

  /* ---------------- MOBILE NATIVE LANDING (Android/iOS) ---------------- */
  if (!isAuthenticated && isLandingPage && isNative) {
    return (
      <>
        <MobileLanding
          onBiometricLogin={triggerBiometricLogin}
          biometricInfo={biometricInfo}
          isBiometricLoading={isBiometricLoading}
        />
        <BiometricConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onEnable={handleConsentEnable}
          onSkip={handleConsentSkip}
          biometricInfo={biometricInfo}
        />
      </>
    );
  }

  /* ---------------- WEB LANDING PAGE ---------------- */
  if (!isAuthenticated && isLandingPage) {
    return (
      <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-background">
        {/* SINGLE landing header (mobile + desktop) */}
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
          <div className="px-4 sm:px-6 md:px-10 flex items-center justify-between h-14 md:h-16">
            <BrandLogo size="md" />

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3 text-sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>

              <Button
                variant="gradient"
                size="sm"
                className="px-3 sm:px-4 text-sm"
                onClick={() => navigate('/signup')}
              >
                Sign up
              </Button>

              <div className="ml-1 sm:ml-3">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-[calc(4rem+env(safe-area-inset-top))] w-full">
          <Outlet />
        </main>
      </div>
    );
  }

  /* ---------------- APP PAGES ---------------- */
  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-background">
      <DesktopNav />

      {/* Mobile app header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <BrandLogo size="sm" />

            {isMyCardPage && !cardsLoading && activeCard && Array.isArray(cards) && (
              <div id="card-selector-mobile" className="ml-2 sm:ml-3 min-w-0 flex-1">
                <CardSelector
                  cards={cards}
                  activeCard={activeCard}
                  onSelect={handleSelectCard}
                  onSetDefault={setDefaultCard}
                  onAdd={handleCreateCard}
                  onDelete={deleteCard}
                  onEditCard={handleEditCard}
                  onUpdateCardName={handleUpdateCardName}
                  variant="mobile"
                  isOrangePlan={isOrangePlan}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isOrangePlan && (
              <span className="w-2.5 h-2.5 rounded-full bg-orange-plan flex-shrink-0" />
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8 w-full">
        <Suspense fallback={<PageSkeleton variant={getSkeletonVariant(location.pathname)} />}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <BottomNav />
      <FirstLoginGuide />
    </div>
  );
}
