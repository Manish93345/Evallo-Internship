import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  type AuthSession,
  type LoginPayload,
  type RegisterPayload,
  type SessionOrganisation,
  type SessionUser,
} from '../lib/authApi';
import { tokenStore } from '../lib/tokenStore';

/**
 * AuthContext exposes the current user/org plus the actions that mutate them.
 * It's the single source of truth that pages and route guards read from.
 *
 * On mount we re-hydrate the session from localStorage; if tokens exist we
 * call /auth/me to make sure they're still valid (e.g. the user could have
 * logged out from another tab, or the server could have been restarted
 * during dev).
 */

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: SessionUser | null;
  organisation: SessionOrganisation | null;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applySession(s: AuthSession): AuthState {
  tokenStore.set({
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    expiresIn: s.expiresIn,
  });
  return { status: 'authenticated', user: s.user, organisation: s.organisation };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: tokenStore.hasSession() ? 'loading' : 'unauthenticated',
    user: null,
    organisation: null,
  });

  // Re-hydrate from /auth/me when tokens exist at boot.
  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.hasSession()) {
      setState({ status: 'unauthenticated', user: null, organisation: null });
      return;
    }
    authApi
      .me()
      .then((data) => {
        if (cancelled) return;
        setState({
          status: 'authenticated',
          user: data.user,
          organisation: data.organisation,
        });
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        setState({ status: 'unauthenticated', user: null, organisation: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for the global "auth:logout" event dispatched by the axios
  // interceptor when refresh fails — keeps state in sync without prop drilling.
  useEffect(() => {
    const handler = () => {
      tokenStore.clear();
      setState({ status: 'unauthenticated', user: null, organisation: null });
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await authApi.login(payload);
    setState(applySession(session));
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await authApi.register(payload);
    setState(applySession(session));
  }, []);

  const logout = useCallback(async () => {
    const rt = tokenStore.getRefreshToken();
    try {
      if (rt) await authApi.logout(rt);
    } catch {
      // Even if the network call fails, we still want to clear local state.
    } finally {
      tokenStore.clear();
      setState({ status: 'unauthenticated', user: null, organisation: null });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
