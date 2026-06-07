import { useState } from 'react';
import {
  LogOut,
  Building2,
  LayoutDashboard,
  Users,
  UsersRound,
  ScrollText,
  Menu,
  X,
} from 'lucide-react';
import { useNavigate, Outlet, NavLink, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

/**
 * Authenticated-layout shell with sidebar nav + top bar.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  HRMS                 Org · ☼ · User · ⏻    │  ← topbar
 *   ├──────────┬──────────────────────────────────┤
 *   │ Sidebar  │   <Outlet />                     │
 *   │  - Dash  │                                  │
 *   │  - Emp   │                                  │
 *   │  - Teams │                                  │
 *   │  - Logs  │                                  │
 *   └──────────┴──────────────────────────────────┘
 *
 *   On screens narrower than `md` the sidebar collapses behind a hamburger
 *   menu and overlays the page. State is local — no global UI store needed.
 */
export function AppShell() {
  const { user, organisation, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* TOP BAR */}
      <header className="border-b border-[#252c52] bg-[#0b1020]/80 backdrop-blur sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:bg-[#1a2148]"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-lg font-bold bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
              HRMS
            </span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              Phase 3
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-slate-200">{organisation?.name}</span>
            </div>
            <ThemeToggle />
            <div className="text-right hidden md:block">
              <div className="text-sm text-slate-100 leading-tight">{user?.name}</div>
              <div className="text-xs text-slate-500 leading-tight">
                {user?.email} · {user?.role}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* SIDEBAR (desktop) */}
        <aside className="hidden md:block w-56 border-r border-[#252c52] bg-[#0a0f24]/40 shrink-0">
          <SidebarNav />
        </aside>

        {/* SIDEBAR (mobile drawer) */}
        {mobileOpen && (
          <>
            <button
              tabIndex={-1}
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
            />
            <aside className="md:hidden fixed top-[57px] bottom-0 left-0 w-60 z-20 border-r border-[#252c52] bg-[#0a0f24]">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </aside>
          </>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="border-t border-[#252c52] text-xs text-slate-500 text-center py-4">
        HRMS · Evallo Assignment · Phase 3 (Frontend CRUD)
      </footer>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/employees', label: 'Employees', icon: Users },
    { to: '/teams', label: 'Teams', icon: UsersRound },
    {
      to: '/audit-logs',
      label: 'Audit logs',
      icon: ScrollText,
      ownerOnly: true,
    },
  ];

  return (
    <nav className="p-3 space-y-0.5 text-sm">
      {items.map((it) => {
        const hide = it.ownerOnly && user?.role !== 'OWNER';
        if (hide) return null;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-brand-500/15 text-brand-200 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#1a2148] border border-transparent',
              )
            }
          >
            <it.icon className="h-4 w-4" />
            <span className="flex-1">{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
