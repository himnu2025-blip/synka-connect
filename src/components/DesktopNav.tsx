import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useAdmin } from '@/hooks/useAdmin';
import { useProfile } from '@/hooks/useProfile';
import { CardSelector } from './CardSelector';
import { BrandLogo } from './BrandLogo';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/crm', icon: Users, label: 'CRM' },
  { to: '/my-card', icon: CreditCard, label: 'My Card' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

/* -----------------------------
   ORANGE PLAN PILL (FINAL)
------------------------------ */
function OrangePlanPill() {
  return (
    <span
      className="
        inline-flex items-center
        px-3 py-1
        rounded-full
        text-xs font-semibold
        bg-orange-plan
        text-white
        tracking-wide
      "
    >
      ORANGE
    </span>
  );
}

export function DesktopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const {
    cards,
    activeCard,
    loading: cardsLoading,
    createCard,
    deleteCard,
    setDefaultCard,
    selectCard,
    updateCard,
  } = useCards();
  const { isAdmin } = useAdmin();
  const { profile } = useProfile();

  const isOrangePlan = profile?.plan?.toLowerCase() === 'orange';
  const isAuthenticated = !loading && !!user;
  const isLandingPage = location.pathname === '/' || location.pathname === '/index';
  const isMyCardPage = location.pathname === '/my-card' || location.pathname === '/card';

  const handleUpdateCardName = async (cardId: string, name: string) => {
    await updateCard(cardId, { name });
  };

  const handleMyCardEditClick = () => {
    navigate('/my-card?edit=true');
  };

  /* -----------------------------
     LANDING HEADER (PUBLIC)
------------------------------ */
  if (!isAuthenticated && isLandingPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between h-14 md:h-16 px-3 sm:px-4 md:px-6">
          <BrandLogo size="sm" className="md:hidden" />
          <BrandLogo size="md" className="hidden md:flex" />

          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button variant="gradient" size="sm" onClick={() => navigate('/signup')}>
              Sign up
            </Button>
          </div>
        </div>
      </header>
    );
  }

  /* -----------------------------
     AUTH HEADER (DESKTOP / TABLET)
------------------------------ */
  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-7xl mx-auto px-3 md:px-4 lg:px-6 xl:px-10 flex items-center justify-between h-14 lg:h-16">
        <div className="flex items-center gap-3 lg:gap-6">
          <BrandLogo size="sm" className="lg:hidden" />
          <BrandLogo size="md" className="hidden lg:flex" />

          {isAuthenticated && (
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  id={item.to === '/my-card' ? 'nav-my-card-desktop' : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </NavLink>
              ))}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )
                  }
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden xl:inline">Admin</span>
                </NavLink>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* ORANGE PLAN (same as mobile) */}
          {isAuthenticated && isOrangePlan && (
            <span className="w-2.5 h-2.5 rounded-full bg-orange-plan flex-shrink-0" />
          )}

          {isAuthenticated && isMyCardPage && !cardsLoading && activeCard && (
            <div id="card-selector-desktop">
            <CardSelector
              cards={cards}
              activeCard={activeCard}
              onSelect={selectCard}
              onSetDefault={setDefaultCard}
              onAdd={createCard}
              onDelete={deleteCard}
              onEditCard={handleMyCardEditClick}
              onUpdateCardName={handleUpdateCardName}
              variant="desktop"
              isOrangePlan={isOrangePlan}
            />
            </div>
          )}

          <ThemeToggle />

          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button variant="gradient" size="sm" onClick={() => navigate('/signup')}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
