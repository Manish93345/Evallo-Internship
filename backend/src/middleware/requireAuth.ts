import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { ApiError } from '../utils/ApiError';

/**
 * Gate that protects every route below it. Extracts a Bearer token from the
 * Authorization header, verifies it, and stamps `req.auth` with identity
 * claims so downstream handlers can scope queries by `organisationId`.
 *
 * We use 401 (Unauthorized) for "no/invalid token" and reserve 403 (Forbidden)
 * for "token is fine but you can't do this action".
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(ApiError.unauthorized('Empty bearer token'));
  }

  try {
    const claims = verifyAccessToken(token);
    req.auth = {
      userId: claims.sub,
      organisationId: claims.org,
      role: claims.role,
      email: claims.email,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Helper for routes that require a specific role (e.g. OWNER-only actions
 * like deleting the organisation). Use AFTER `requireAuth`.
 */
export function requireRole(...roles: Array<'OWNER' | 'MEMBER'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    return next();
  };
}
