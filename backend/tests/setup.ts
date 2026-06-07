/**
 * Global test setup.
 *
 * Phase 4 introduces a test database. The pattern:
 *
 *   • If `TEST_DATABASE_URL` is set, we point Prisma at that connection. The
 *     plan is for the reviewer to create a *second* Neon branch (free, takes
 *     ~5 seconds) so tests can truncate tables without nuking dev data.
 *   • If it isn't set, we fall back to `DATABASE_URL` but loudly warn —
 *     tests will still work (every suite cleans up after itself) but the
 *     reviewer's dev data is at the mercy of `beforeEach` truncates.
 *
 * We also force a couple of env defaults so missing values don't crash the
 * env validator before any test runs.
 */

import 'dotenv/config';

// 1) Wire TEST_DATABASE_URL → DATABASE_URL *before* Prisma loads anywhere.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (!process.env.CI) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n⚠️  TEST_DATABASE_URL not set — tests will hit your dev DATABASE_URL.\n' +
      '   Create a Neon branch and put its URL in backend/.env.test to isolate.\n',
  );
}

// 2) Make sure mandatory env vars exist *before* src/config/env.ts loads.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-1234567890';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
// Lower bcrypt rounds in tests — 12 rounds × dozens of users × dozens of tests
// is painful. 4 rounds is fine: tests don't need cryptographic strength.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '4';

// 3) Truncate the test DB once before the whole suite + disconnect on exit.
//    We import lazily so the env tweaks above take effect first.
import { afterAll, beforeAll } from 'vitest';

beforeAll(async () => {
  const { prisma } = await import('../src/config/db');
  // Order matters because of FK constraints.
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();
});

afterAll(async () => {
  const { prisma } = await import('../src/config/db');
  await prisma.$disconnect();
});
