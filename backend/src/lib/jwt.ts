import jwt, { type SignOptions, type JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * Two-token JWT strategy:
 *   • Access token  — short-lived (15m), sent on every API request as
 *                     `Authorization: Bearer <token>`. Carries identity claims.
 *   • Refresh token — long-lived (7d), used ONLY against `/auth/refresh` to
 *                     mint a new access token. Stored hashed in the DB so we
 *                     can rotate and revoke.
 *
 * Why two tokens? If the access token leaks, the damage window is 15 minutes.
 * The refresh token never travels except to the refresh endpoint.
 */

export interface AccessTokenClaims extends JwtPayload {
  sub: string;            // user id
  org: string;            // organisation id
  role: Role;
  email: string;
  typ: 'access';
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string;            // user id
  org: string;
  jti: string;            // unique id matching the DB row
  typ: 'refresh';
}

export function signAccessToken(payload: {
  userId: string;
  organisationId: string;
  role: Role;
  email: string;
}): string {
  const claims: Omit<AccessTokenClaims, keyof JwtPayload> = {
    sub: payload.userId,
    org: payload.organisationId,
    role: payload.role,
    email: payload.email,
    typ: 'access',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    issuer: 'hrms-api',
    audience: 'hrms-client',
  };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: {
  userId: string;
  organisationId: string;
  jti: string;
}): string {
  const claims: Omit<RefreshTokenClaims, keyof JwtPayload> = {
    sub: payload.userId,
    org: payload.organisationId,
    jti: payload.jti,
    typ: 'refresh',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
    issuer: 'hrms-api',
    audience: 'hrms-client',
  };
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'hrms-api',
      audience: 'hrms-client',
    }) as AccessTokenClaims;
    if (decoded.typ !== 'access') {
      throw ApiError.unauthorized('Wrong token type');
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'hrms-api',
      audience: 'hrms-client',
    }) as RefreshTokenClaims;
    if (decoded.typ !== 'refresh') {
      throw ApiError.unauthorized('Wrong token type');
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}

/**
 * SHA-256 hash a refresh token before storing it. We never store raw tokens
 * — only their hashes, so a DB leak doesn't immediately compromise sessions.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Cryptographically random JTI used both as the DB row id and the `jti` claim.
 */
export function newJti(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Parse a duration string like "7d", "15m", "3600s" into milliseconds.
 * We need this to compute `expiresAt` for the DB row that tracks the refresh
 * token's lifetime independently of the JWT itself.
 */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(input.trim());
  if (!match) {
    // Allow plain numbers as seconds
    const asNumber = Number(input);
    if (!Number.isNaN(asNumber)) return asNumber * 1000;
    throw new Error(`Invalid duration string: ${input}`);
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  if (!multiplier) throw new Error(`Invalid duration unit: ${unit}`);
  return value * multiplier;
}
