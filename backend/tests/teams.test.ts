/**
 * Teams CRUD + many-to-many assignment tests.
 *
 * Specifically exercises the bulk-assign endpoint, which is the trickiest
 * piece of Phase 2 (transactional, idempotent, org-scoped on both sides).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, authed, registerTestOrg, resetDb } from './helpers';

describe('Teams — CRUD + member assignment', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('creates a team and shows it in the list with a member count', async () => {
    const session = await registerTestOrg();

    const create = await request(app)
      .post('/api/v1/teams')
      .set(authed(session.accessToken))
      .send({ name: 'Engineering', description: 'Ships the product.' });

    expect(create.status).toBe(201);
    expect(create.body.name).toBe('Engineering');

    const list = await request(app).get('/api/v1/teams').set(authed(session.accessToken));
    expect(list.status).toBe(200);
    const team = list.body.data.find((t: { name: string }) => t.name === 'Engineering');
    expect(team).toBeTruthy();
    expect(team.memberCount).toBe(0);
  });

  it('assigns multiple employees to a team in one call (M:N)', async () => {
    const session = await registerTestOrg();

    const team = await request(app)
      .post('/api/v1/teams')
      .set(authed(session.accessToken))
      .send({ name: 'Design' });

    const e1 = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({ firstName: 'D1', lastName: 'X', email: 'd1@x.test' });
    const e2 = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({ firstName: 'D2', lastName: 'X', email: 'd2@x.test' });

    const assign = await request(app)
      .post(`/api/v1/teams/${team.body.id}/members`)
      .set(authed(session.accessToken))
      .send({ employeeIds: [e1.body.id, e2.body.id] });

    expect(assign.status).toBe(200);
    expect(assign.body.addedCount).toBe(2);
    expect(assign.body.members.map((m: { id: string }) => m.id).sort()).toEqual(
      [e1.body.id, e2.body.id].sort(),
    );
  });

  it('re-assignment is idempotent (addedCount = 0 on second call)', async () => {
    const session = await registerTestOrg();
    const team = await request(app)
      .post('/api/v1/teams')
      .set(authed(session.accessToken))
      .send({ name: 'Ops' });
    const emp = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({ firstName: 'O', lastName: 'X', email: 'o@x.test' });

    const first = await request(app)
      .post(`/api/v1/teams/${team.body.id}/members`)
      .set(authed(session.accessToken))
      .send({ employeeIds: [emp.body.id] });
    expect(first.body.addedCount).toBe(1);

    const second = await request(app)
      .post(`/api/v1/teams/${team.body.id}/members`)
      .set(authed(session.accessToken))
      .send({ employeeIds: [emp.body.id] });
    expect(second.status).toBe(200);
    expect(second.body.addedCount).toBe(0);
    expect(second.body.members).toHaveLength(1);
  });

  it('removes a single team member with DELETE /teams/:id/members/:employeeId', async () => {
    const session = await registerTestOrg();
    const team = await request(app)
      .post('/api/v1/teams')
      .set(authed(session.accessToken))
      .send({ name: 'Marketing' });
    const emp = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({ firstName: 'M', lastName: 'X', email: 'm@x.test' });

    await request(app)
      .post(`/api/v1/teams/${team.body.id}/members`)
      .set(authed(session.accessToken))
      .send({ employeeIds: [emp.body.id] });

    const del = await request(app)
      .delete(`/api/v1/teams/${team.body.id}/members/${emp.body.id}`)
      .set(authed(session.accessToken));
    expect(del.status).toBe(204);

    const teamDetail = await request(app)
      .get(`/api/v1/teams/${team.body.id}`)
      .set(authed(session.accessToken));
    expect(teamDetail.body.members).toHaveLength(0);
  });
});
