/**
 * Token storage abstraction.
 *
 * We use localStorage for simplicity — refresh tokens are NOT in httpOnly
 * cookies. Trade-off: localStorage is vulnerable to XSS if our React app
 * has an XSS bug, while httpOnly cookies aren't. For an interview assignment
 * this is the right balance (no CSRF complexity, no cookie domain headaches).
 * In production we'd move refresh tokens to httpOnly+SameSite=strict cookies.
 *
 * The store is centralised so swapping the backing storage later is a
 * one-file change.
 */

const ACCESS_KEY = 'hrms.accessToken';
const REFRESH_KEY = 'hrms.refreshToken';
const EXPIRY_KEY = 'hrms.accessExpiresAt'; // ms epoch

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds (server tells us). */
  expiresIn: number;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore (private mode, etc.) */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const tokenStore = {
  set(tokens: StoredTokens) {
    safeSet(ACCESS_KEY, tokens.accessToken);
    safeSet(REFRESH_KEY, tokens.refreshToken);
    safeSet(EXPIRY_KEY, String(Date.now() + tokens.expiresIn * 1000));
  },

  getAccessToken(): string | null {
    return safeGet(ACCESS_KEY);
  },

  getRefreshToken(): string | null {
    return safeGet(REFRESH_KEY);
  },

  /** True if we believe the access token is still valid (with 10s safety margin). */
  isAccessFresh(): boolean {
    const expiry = safeGet(EXPIRY_KEY);
    if (!expiry) return false;
    return Number(expiry) - 10_000 > Date.now();
  },

  clear() {
    safeRemove(ACCESS_KEY);
    safeRemove(REFRESH_KEY);
    safeRemove(EXPIRY_KEY);
  },

  /** Convenience: do we have any tokens at all? */
  hasSession(): boolean {
    return Boolean(safeGet(ACCESS_KEY) && safeGet(REFRESH_KEY));
  },
};
