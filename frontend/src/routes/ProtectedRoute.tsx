import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard for pages that require authentication. If the user is not
 * signed in, they're redirected to /login and we remember where they came
 * from so we can send them back after a successful login.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Verifying session…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/**
 * Mirror guard: redirects already-authenticated users away from /login and
 * /register, so they don't see the login page if they refresh while signed in.
 */
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
