import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/crm', icon: Users, label: 'CRM' },
  { to: '/my-card', icon: CreditCard, label: 'My Card' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isAdmin } = useAdmin();

  const isLandingPage = location.pathname === '/';
  const isAuthenticated = !loading && !!user;
  
  // Build nav items dynamically based on admin status
  const currentNavItems = isAdmin 
    ? [...navItems, { to: '/admin', icon: Shield, label: 'Admin' }]
    : navItems;

  // Hide bottom nav for unauthenticated users on landing page
  if (!isAuthenticated && isLandingPage) {
    return null;
  }

  // Also hide if not authenticated at all
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/30 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-2 px-1 sm:px-2">
        {currentNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.to === '/my-card' ? 'nav-my-card' : undefined}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-2 px-2 sm:px-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[72px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/70 hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5 mb-1 transition-transform duration-200 flex-shrink-0", isActive && "scale-105")} />
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
