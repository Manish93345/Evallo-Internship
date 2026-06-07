/**
 * Multi-tenant isolation tests — the most important guarantee in the whole
 * codebase.
 *
 * Two orgs are created. Org A creates an employee + a team. Org B then tries
 * to read / update / delete those resources by UUID. Every cross-tenant call
 * MUST come back as 404 (NOT 403) — we deliberately do not leak whether the
 * row exists in another tenant.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, authed, registerTestOrg, resetDb } from './helpers';

describe('Multi-tenant isolation', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('returns 404 when org B reads an employee belonging to org A', async () => {
    const orgA = await registerTestOrg({ organisationName: 'Org A' });
    const orgB = await registerTestOrg({ organisationName: 'Org B' });

    const created = await request(app)
      .post('/api/v1/employees')
      .set(authed(orgA.accessToken))
      .send({ firstName: 'Cross', lastName: 'Tenant', email: 'x@orga.test' });
    expect(created.status).toBe(201);

    const sneaky = await request(app)
      .get(`/api/v1/employees/${created.body.id}`)
      .set(authed(orgB.accessToken));

    expect(sneaky.status).toBe(404);
    expect(sneaky.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when org B updates an employee belonging to org A', async () => {
    const orgA = await registerTestOrg({ organisationName: 'Org A2' });
    const orgB = await registerTestOrg({ organisationName: 'Org B2' });

    const created = await request(app)
      .post('/api/v1/employees')
      .set(authed(orgA.accessToken))
      .send({ firstName: 'Cross', lastName: 'Tenant', email: 'x2@orga.test' });

    const evil = await request(app)
      .patch(`/api/v1/employees/${created.body.id}`)
      .set(authed(orgB.accessToken))
      .send({ position: 'I do not work here' });

    expect(evil.status).toBe(404);
  });

  it('returns 404 when org B tries to assign its own employees to org A’s team', async () => {
    const orgA = await registerTestOrg({ organisationName: 'Tenant-A' });
    const orgB = await registerTestOrg({ organisationName: 'Tenant-B' });

    // Org A creates a team.
    const aTeam = await request(app)
      .post('/api/v1/teams')
      .set(authed(orgA.accessToken))
      .send({ name: 'Secret Project' });

    // Org B creates an employee in its OWN tenant.
    const bEmp = await request(app)
      .post('/api/v1/employees')
      .set(authed(orgB.accessToken))
      .send({ firstName: 'Spy', lastName: 'Guy', email: 'spy@b.test' });

    // Org B tries to drop its employee into org A's team using the team's UUID.
    const attempt = await request(app)
      .post(`/api/v1/teams/${aTeam.body.id}/members`)
      .set(authed(orgB.accessToken))
      .send({ employeeIds: [bEmp.body.id] });

    // Team is invisible to org B → 404 (not 403, on purpose).
    expect(attempt.status).toBe(404);
  });

  it('list endpoints only return rows from the caller’s organisation', async () => {
    const orgA = await registerTestOrg({ organisationName: 'List-A' });
    const orgB = await registerTestOrg({ organisationName: 'List-B' });

    await request(app)
      .post('/api/v1/employees')
      .set(authed(orgA.accessToken))
      .send({ firstName: 'A', lastName: 'Person', email: 'list-a@a.test' });
    await request(app)
      .post('/api/v1/employees')
      .set(authed(orgB.accessToken))
      .send({ firstName: 'B', lastName: 'Person', email: 'list-b@b.test' });

    const listFromA = await request(app)
      .get('/api/v1/employees')
      .set(authed(orgA.accessToken));
    const emails = listFromA.body.data.map((e: { email: string }) => e.email);

    expect(emails).toContain('list-a@a.test');
    expect(emails).not.toContain('list-b@b.test');
  });

  it('owner-only audit log endpoint is forbidden for a MEMBER role token', async () => {
    // We register an org (= OWNER), then create a second user with MEMBER role
    // directly in the DB and mint a token for them. This is the cheapest way
    // to assert the requireRole('OWNER') guard without building a /users
    // module just for tests.
    const { prisma } = await import('../src/config/db');
    const { signAccessToken } = await import('../src/lib/jwt');

    const orgA = await registerTestOrg({ organisationName: 'Roles Inc.' });
    const member = await prisma.user.create({
      data: {
        organisationId: orgA.organisationId,
        email: `member-${Date.now()}@roles.test`,
        passwordHash: 'unused-in-this-test',
        name: 'Just A Member',
        role: 'MEMBER',
      },
    });
    const memberToken = signAccessToken({
      userId: member.id,
      organisationId: member.organisationId,
      role: member.role,
      email: member.email,
    });

    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set(authed(memberToken));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
