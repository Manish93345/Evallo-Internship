/**
 * Employees CRUD tests.
 *
 * Covers create / read / update / delete plus a 404 path for missing IDs.
 * Each test owns its tenant via `registerTestOrg`, so it can't be flaked by
 * data from a neighbouring test.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, authed, registerTestOrg, resetDb } from './helpers';

describe('Employees — CRUD', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('creates an employee and returns it in the list', async () => {
    const session = await registerTestOrg();

    const create = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@analytical.test',
        position: 'Chief Mathematician',
      });

    expect(create.status).toBe(201);
    expect(create.body.id).toEqual(expect.any(String));
    expect(create.body.email).toBe('ada@analytical.test');
    expect(create.body.teams).toEqual([]);

    const list = await request(app)
      .get('/api/v1/employees')
      .set(authed(session.accessToken));

    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBe(1);
    expect(list.body.data[0].email).toBe('ada@analytical.test');
  });

  it('updates an employee', async () => {
    const session = await registerTestOrg();
    const created = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@cobol.test',
      });
    expect(created.status).toBe(201);

    const update = await request(app)
      .patch(`/api/v1/employees/${created.body.id}`)
      .set(authed(session.accessToken))
      .send({ position: 'Rear Admiral' });

    expect(update.status).toBe(200);
    expect(update.body.position).toBe('Rear Admiral');
    expect(update.body.email).toBe('grace@cobol.test'); // unchanged
  });

  it('deletes an employee', async () => {
    const session = await registerTestOrg();
    const created = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({
        firstName: 'Linus',
        lastName: 'Torvalds',
        email: 'linus@kernel.test',
      });

    const del = await request(app)
      .delete(`/api/v1/employees/${created.body.id}`)
      .set(authed(session.accessToken));
    expect(del.status).toBe(204);

    const getAfter = await request(app)
      .get(`/api/v1/employees/${created.body.id}`)
      .set(authed(session.accessToken));
    expect(getAfter.status).toBe(404);
  });

  it('returns 404 for an employee id that does not exist', async () => {
    const session = await registerTestOrg();
    const res = await request(app)
      .get('/api/v1/employees/00000000-0000-0000-0000-000000000000')
      .set(authed(session.accessToken));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects duplicate emails within an organisation with 409', async () => {
    const session = await registerTestOrg();

    const first = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({ firstName: 'Alan', lastName: 'Turing', email: 'alan@enigma.test' });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/v1/employees')
      .set(authed(session.accessToken))
      .send({ firstName: 'Alan', lastName: 'Turing II', email: 'alan@enigma.test' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });
});
