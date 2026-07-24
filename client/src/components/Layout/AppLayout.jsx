import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '../../utils/cn';
import useAuthStore from '../../store/authStore';
import { applyBranding, resetBranding } from '../../utils/branding';
import { useAutoTooltips } from '../../hooks/useAutoTooltips';
import TooltipLayer from '../ui/TooltipLayer';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop rail collapse
  const [mobileOpen, setMobileOpen] = useState(false);             // mobile drawer open
  const branding = useAuthStore(s => s.garage?.branding);

  // App-wide native tooltips on every button / link / icon control
  useAutoTooltips();

  // Apply garage branding to CSS variables — instant theme on load/change
  useEffect(() => {
    if (branding) applyBranding(branding);
    else resetBranding();
  }, [branding?.primaryColor, branding?.menuColor, branding?.headerColor]);

  // Super-admin "login as franchise" banner — lets them return to the admin list.
  const impersonating = typeof window !== 'undefined' ? localStorage.getItem('ttn_impersonating') : null;
  const exitImpersonation = () => {
    localStorage.removeItem('ttn_token');
    localStorage.removeItem('ttn_impersonating');
    window.location.href = '/superadmin/garages';
  };

  // Hamburger: on desktop (lg+) collapses the fixed rail; on mobile toggles the drawer.
  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarCollapsed(v => !v);
    } else {
      setMobileOpen(v => !v);
    }
  };

  return (
    <div className="min-h-screen bg-page flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed(v => !v)}
        onNavigate={() => setMobileOpen(false)}
      />
      {/* Mobile backdrop (below the sidebar, above content) */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={cn('flex-1 min-w-0 flex flex-col transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-[230px]')}>
        {impersonating && (
          <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between gap-3">
            <span>You are viewing <b>{impersonating}</b> as Super Admin.</span>
            <button onClick={exitImpersonation}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors">
              ← Back to Super Admin
            </button>
          </div>
        )}
        <Topbar onToggleSidebar={handleToggle} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <TooltipLayer />
    </div>
  );
}
