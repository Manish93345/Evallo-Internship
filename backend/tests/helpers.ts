/**
 * Shared test helpers.
 *
 * Keeps each test file readable by pushing the boring scaffolding (build the
 * app, register an org, attach an Authorization header) into one place.
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';

export const app = createApp();

export interface TestSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  organisationId: string;
  email: string;
  orgName: string;
}

/**
 * Generates a unique email/org name per call so a single test file can spin
 * up multiple isolated tenants without colliding on the unique constraint.
 */
let counter = 0;
function uniqueSuffix() {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}

export async function registerTestOrg(overrides: Partial<{
  name: string;
  email: string;
  organisationName: string;
  password: string;
}> = {}): Promise<TestSession> {
  const suffix = uniqueSuffix();
  const body = {
    name: overrides.name ?? `Tester ${suffix}`,
    email: overrides.email ?? `tester-${suffix}@example.test`,
    organisationName: overrides.organisationName ?? `Org ${suffix}`,
    password: overrides.password ?? 'Password123',
  };

  const res = await request(app).post('/api/v1/auth/register').send(body);
  if (res.status !== 201) {
    throw new Error(`registerTestOrg failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    userId: res.body.user.id,
    organisationId: res.body.organisation.id,
    email: res.body.user.email,
    orgName: res.body.organisation.name,
  };
}

/** Convenience: attaches Authorization: Bearer <token>. */
export function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Reset all business tables between tests. The order respects FK
 * constraints — junctions first, then leaves, then root tables.
 */
export async function resetDb() {
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();
}
