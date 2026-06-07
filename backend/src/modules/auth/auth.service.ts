import type { Request } from 'express';
import { Role, EntityType, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  newJti,
  parseDurationMs,
} from '../../lib/jwt';
import { logAudit } from '../../lib/audit';
import { slugify, type RegisterInput, type LoginInput } from './auth.schema';

/**
 * Pure-ish business logic for auth. The controller layer adapts HTTP, this
 * layer talks to Prisma, password/JWT helpers, and the audit log.
 *
 * Every method that mutates state writes to audit_logs in the same flow.
 * Where appropriate the DB write + audit write happen inside a transaction
 * so we never end up with a half-created org.
 */

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // access token TTL in seconds (handy for the client)
}

export interface AuthenticatedSession extends AuthTokenPair {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
}

// ---------- Register ----------

export async function registerOrganisation(
  input: RegisterInput,
  req: Request,
): Promise<AuthenticatedSession> {
  // Pre-check: is email already in use? (Cheap UX win — we still rely on the
  // DB unique constraint as the source of truth, see catch block below.)
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const passwordHash = await hashPassword(input.password);
  const baseSlug = slugify(input.organisationName) || 'org';

  // Wrap org + user creation in a transaction so a failure on user creation
  // doesn't leave an orphan organisation behind.
  const created = await prisma
    .$transaction(async (tx) => {
      // Slug collision handling — append a short random suffix if taken.
      let slug = baseSlug;
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const clash = await tx.organisation.findUnique({ where: { slug }, select: { id: true } });
        if (!clash) break;
        attempt += 1;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        if (attempt > 5) {
          throw ApiError.conflict('Could not generate a unique slug — try a different organisation name.');
        }
      }

      const organisation = await tx.organisation.create({
        data: { name: input.organisationName.trim(), slug },
      });
      const user = await tx.user.create({
        data: {
          organisationId: organisation.id,
          email: input.email,
          passwordHash,
          name: input.name.trim(),
          role: Role.OWNER, // first user of an org always owns it
        },
      });
      return { organisation, user };
    })
    .catch((err) => {
      // Friendly mapping of the Prisma unique-constraint error
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('Email or organisation already exists.');
      }
      throw err;
    });

  // Issue tokens BEFORE the audit write so we can include user IDs cleanly.
  const tokens = await issueTokensForUser(created.user, req);

  await logAudit({
    organisationId: created.organisation.id,
    userId: created.user.id,
    action: 'ORG_REGISTERED',
    entityType: EntityType.ORGANISATION,
    entityId: created.organisation.id,
    metadata: { orgName: created.organisation.name, userEmail: created.user.email },
    req,
  });

  return {
    ...tokens,
    user: {
      id: created.user.id,
      email: created.user.email,
      name: created.user.name,
      role: created.user.role,
    },
    organisation: {
      id: created.organisation.id,
      name: created.organisation.name,
      slug: created.organisation.slug,
    },
  };
}

// ---------- Login ----------

export async function login(input: LoginInput, req: Request): Promise<AuthenticatedSession> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { organisation: true },
  });

  // Timing-safe: verifyPassword always runs bcrypt even if user is null.
  const ok = await verifyPassword(input.password, user?.passwordHash);

  if (!user || !ok) {
    // Log the failed attempt — note: no userId because the user may not exist.
    await logAudit({
      organisationId: user?.organisationId ?? null,
      userId: user?.id ?? null,
      action: 'LOGIN_FAILED',
      entityType: EntityType.AUTH,
      metadata: { email: input.email, reason: user ? 'BAD_PASSWORD' : 'UNKNOWN_EMAIL' },
      req,
    });
    // Generic error so we don't reveal whether the email exists.
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const tokens = await issueTokensForUser(user, req);

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    entityType: EntityType.AUTH,
    entityId: user.id,
    req,
  });

  return {
    ...tokens,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organisation: {
      id: user.organisation.id,
      name: user.organisation.name,
      slug: user.organisation.slug,
    },
  };
}

// ---------- Refresh (with rotation) ----------

export async function refresh(refreshToken: string, req: Request): Promise<AuthTokenPair> {
  // Step 1 — verify the JWT signature/expiry.
  const claims = verifyRefreshToken(refreshToken);

  // Step 2 — verify the token row exists, isn't revoked, hasn't expired,
  // and matches the hash we stored at issue time.
  const tokenHash = hashRefreshToken(refreshToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    // Possible token-reuse attack: if a refresh comes in for a revoked token
    // we conservatively kill every active session for the user.
    if (row?.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await logAudit({
        organisationId: row.organisationId,
        userId: row.userId,
        action: 'REFRESH_REUSED_REVOKED_ALL',
        entityType: EntityType.AUTH,
        req,
      });
    }
    throw ApiError.unauthorized('Refresh token is invalid or expired.');
  }

  if (row.userId !== claims.sub || row.organisationId !== claims.org) {
    throw ApiError.unauthorized('Refresh token mismatch.');
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) throw ApiError.unauthorized('User no longer exists.');

  // Step 3 — rotate: revoke this token and issue a fresh pair.
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  const tokens = await issueTokensForUser(user, req);

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'REFRESH_SUCCESS',
    entityType: EntityType.AUTH,
    entityId: user.id,
    req,
  });

  return tokens;
}

// ---------- Logout ----------

export async function logout(opts: {
  userId: string;
  organisationId: string;
  refreshToken?: string;
  req: Request;
}): Promise<void> {
  const { userId, organisationId, refreshToken, req } = opts;

  // Best-effort revocation. If a specific refresh token is provided we
  // revoke just that session; otherwise we revoke every active session
  // for the user (full sign-out).
  if (refreshToken) {
    try {
      const tokenHash = hashRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // ignore — defensive
    }
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await logAudit({
    organisationId,
    userId,
    action: 'LOGOUT',
    entityType: EntityType.AUTH,
    entityId: userId,
    metadata: { scope: refreshToken ? 'SINGLE_SESSION' : 'ALL_SESSIONS' },
    req,
  });
}

// ---------- Helpers ----------

async function issueTokensForUser(
  user: { id: string; organisationId: string; role: Role; email: string },
  req: Request,
): Promise<AuthTokenPair> {
  const jti = newJti();
  const accessToken = signAccessToken({
    userId: user.id,
    organisationId: user.organisationId,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    organisationId: user.organisationId,
    jti,
  });

  const ttlMs = parseDurationMs(env.JWT_REFRESH_TTL);
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      organisationId: user.organisationId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlMs),
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(parseDurationMs(env.JWT_ACCESS_TTL) / 1000),
  };
}

// ---------- /auth/me ----------

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organisation: true },
  });
  if (!user) throw ApiError.unauthorized('User not found');
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    organisation: {
      id: user.organisation.id,
      name: user.organisation.name,
      slug: user.organisation.slug,
      createdAt: user.organisation.createdAt,
    },
  };
}
