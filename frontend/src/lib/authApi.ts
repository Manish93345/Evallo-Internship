import { api } from './api';

/**
 * Thin typed wrappers around the auth endpoints. Keeping the wire shape in
 * one place means components don't sprinkle string URLs across the codebase.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
}

export interface SessionOrganisation {
  id: string;
  name: string;
  slug: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
  organisation: SessionOrganisation;
}

export interface RegisterPayload {
  organisationName: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (body: RegisterPayload) =>
    api.post<AuthSession>('/auth/register', body).then((r) => r.data),

  login: (body: LoginPayload) =>
    api.post<AuthSession>('/auth/login', body).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }).then((r) => r.data),

  me: () =>
    api
      .get<{ user: SessionUser & { createdAt: string }; organisation: SessionOrganisation }>(
        '/auth/me',
      )
      .then((r) => r.data),
};
