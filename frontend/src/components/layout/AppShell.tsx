import { LogOut, Building2 } from 'lucide-react';
import { useNavigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

/**
 * Authenticated-layout shell: top nav with brand, org name, user identity,
 * and a logout button. Pages render inside <Outlet />.
 */
export function AppShell() {
  const { user, organisation, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[#252c52] bg-[#0b1020]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-lg font-bold bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
              HRMS
            </span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              Phase 1
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-slate-200">{organisation?.name}</span>
            </div>
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-[#252c52] text-xs text-slate-500 text-center py-4">
        HRMS · Evallo Assignment · Phase 1 (Data & Auth)
      </footer>
    </div>
  );
}
