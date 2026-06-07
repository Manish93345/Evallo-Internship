import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

/**
 * Centralised axios instance. In dev, Vite's proxy forwards /api → backend,
 * so we leave baseURL relative. In production, set VITE_API_BASE_URL.
 *
 * Two interceptors do the heavy lifting:
 *  1. Request — attach the current access token (if any) as Bearer.
 *  2. Response — on 401, attempt ONE silent refresh, then retry the original
 *     request. If refresh also fails, sign the user out hard.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  withCredentials: false, // we use Bearer tokens, not cookies
  headers: { 'Content-Type': 'application/json' },
});

// ---------- Request interceptor: attach access token ----------
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ---------- Response interceptor: refresh on 401 ----------
//
// We coalesce concurrent refresh attempts: if 5 requests fire and all hit a
// 401 at once, only ONE refresh request goes out — the others wait on the
// same promise. This is the classic "refresh storm" mitigation.

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${baseURL}/api/v1/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const { accessToken, refreshToken: newRefresh, expiresIn } = res.data;
    tokenStore.set({ accessToken, refreshToken: newRefresh, expiresIn });
    return accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    // Only try to refresh on a genuine 401 from a non-auth endpoint, and only
    // once per request.
    if (
      status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/register') &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retried = true;
      refreshInFlight = refreshInFlight ?? performRefresh();
      const newToken = await refreshInFlight;
      refreshInFlight = null;

      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api.request(original);
      }
      // Refresh failed — dispatch a custom event so AuthContext can react.
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  },
);

/**
 * Extract a user-friendly error message from an axios error response.
 */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message || err.message || 'Network error';
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}
