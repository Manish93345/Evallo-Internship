/**
 * Auth flow tests.
 *
 * Covers the four canonical paths through /api/v1/auth:
 *   1. Register → returns tokens + 201
 *   2. Register conflict → 409 on duplicate email
 *   3. Login happy path → 200 + tokens for the registered user
 *   4. Login failure → 401 with a generic message (no enumeration)
 *   5. /auth/me → returns the user + organisation behind the bearer token
 *   6. /auth/me without token → 401
 *
 * Per the project plan: auth happy path + auth failures count toward the
 * 8–10 mandatory tests.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, authed, registerTestOrg, resetDb } from './helpers';

describe('Auth — register / login / me', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('registers a new organisation and returns a token pair', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      organisationName: 'Globex',
      name: 'Hank Scorpio',
      email: 'hank@globex.test',
      password: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('hank@globex.test');
    expect(res.body.user.role).toBe('OWNER');
    expect(res.body.organisation.name).toBe('Globex');
  });

  it('rejects a duplicate registration with 409 CONFLICT', async () => {
    // First registration succeeds via helper.
    const session = await registerTestOrg({ email: 'dup@example.test' });
    expect(session.email).toBe('dup@example.test');

    // Second registration on the same email must fail with 409.
    const res = await request(app).post('/api/v1/auth/register').send({
      organisationName: 'Acme 2',
      name: 'Dup User',
      email: 'dup@example.test',
      password: 'Password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in with the correct password', async () => {
    const password = 'Password123';
    const session = await registerTestOrg({ email: 'login@example.test', password });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.test',
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.id).toBe(session.userId);
  });

  it('rejects login with a wrong password (401, generic message)', async () => {
    await registerTestOrg({ email: 'badpw@example.test', password: 'Password123' });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'badpw@example.test',
      password: 'definitely-wrong',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // No enumeration: the message must not reveal "user exists, wrong pw".
    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });

  it('returns the current session on GET /auth/me', async () => {
    const session = await registerTestOrg({
      email: 'me@example.test',
      organisationName: 'Me Inc.',
    });

    const res = await request(app).get('/api/v1/auth/me').set(authed(session.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.test');
    expect(res.body.organisation.name).toBe('Me Inc.');
  });

  it('rejects /auth/me without a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
