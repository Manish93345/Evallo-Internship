# HRMS — Evallo Full-Stack Assignment

> A multi-tenant Human Resource Management System with organisation-scoped
> employee & team management, JWT auth, and a full audit trail.
> Built with **Node.js + Express + TypeScript** on the backend,
> **React + Vite + TypeScript** on the frontend, and
> **Neon Postgres + Prisma** for data.

**Author:** Manish Kumar
**Submitted to:** Evallo · Round 3 Full-Stack Engineer
**Status:** Phase 0 + 1 + 2 + 3 + 4 complete · running locally (deployment configs ready, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

> 📸 Screenshots live in [`docs/screenshots/`](docs/screenshots/). Once captured, they render at the top of this README — see [`docs/SUBMISSION_CHECKLIST.md § 2`](docs/SUBMISSION_CHECKLIST.md).
>
> ▶️ **Want to verify every layer end-to-end?** Follow [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) — curl-by-curl backend smoke tests + click-by-click UI walkthrough.

---

## 📋 Table of contents

1. [What's in this repo](#whats-in-this-repo)
2. [Tech stack & reasoning](#tech-stack--reasoning)
3. [Prerequisites](#prerequisites)
4. [Setup — Neon + Backend + Frontend](#setup--neon--backend--frontend)
5. [Running the test suite](#running-the-test-suite)
6. [Available scripts](#available-scripts)
7. [Project structure](#project-structure)
8. [API documentation](#api-documentation)
9. [Design decisions & trade-offs](#design-decisions--trade-offs)
10. [What I'd do with more time](#what-id-do-with-more-time)
11. [Troubleshooting](#troubleshooting)

---

## What's in this repo

**Phase 0 — Foundation:** Monorepo scaffold, TypeScript everywhere, Neon
connection, env validation with Zod, structured Winston logs, graceful
shutdown.

**Phase 1 — Data & Auth:** Full Prisma schema (organisations, users,
employees, teams, team_members, audit_logs, refresh_tokens). JWT access
(15m) + refresh (7d) with **DB-tracked rotation + revocation**, bcrypt
(12 rounds), timing-safe login, per-route rate limiting, every auth
event recorded to `audit_logs`.

**Phase 2 — Core API:** Employees CRUD, Teams CRUD, transactional
**bulk team-member assignment**, audit-log API (OWNER-gated),
multi-tenant guard via `lib/scope.ts` — cross-tenant access returns
**404 (not 403)** so we don't leak existence. Postman collection with
30 requests / 55 assertions.

**Phase 3 — Frontend:** App shell, dashboard with live stats,
Employees + Teams CRUD pages, Audit Logs page with action/entity/date
filters and expandable before/after diffs, React Query everywhere,
forms via `react-hook-form` + Zod, global error boundary, focus-trapped
dialogs, empty states, loading skeletons, **dark / light theme toggle**.

**Phase 4 — Polish (complete):**

- ✅ **20 backend tests** with Vitest + Supertest across auth, employees,
  teams, M:N assignment, multi-tenant isolation, and role gating.
- ✅ **Prisma seed script** — `npm run seed` populates a demo tenant
  (1 org · 2 users · 8 employees · 3 teams · realistic assignments)
  so reviewers can log in and explore immediately.
- ✅ **Final sweep** — no `console.log`s in `src/`, no dead code, no
  TODOs, `lint` + `typecheck` clean in both packages.
- ✅ **Deployment configs** — `backend/render.yaml` blueprint and
  `frontend/vercel.json` committed; `docs/DEPLOYMENT.md` is a step-by-step
  runbook. Whoever wants live URLs gets there in ~20 minutes.
- ✅ **GitHub Actions CI** — typecheck + lint + build on every push.
  Tests gated behind a commented block so the repo doesn't require
  a Postgres secret to run green.
- ✅ **End-to-end testing guide** — `docs/TESTING_GUIDE.md` walks a
  reviewer through verifying every layer (DB → API → UI → automated
  suite → multi-tenant isolation) curl-by-curl and click-by-click.
- ✅ **Submission checklist** — `docs/SUBMISSION_CHECKLIST.md` for the
  final-mile work: screenshots, commit-history polish, clean rebuild,
  zip command, email template.
- ✅ Engineering notes for each phase in `docs/PHASE{1,2,3,4}_NOTES.md`.

The full original phase plan is in `docs/PROJECT_PLAN.html` — open it
in any browser.

---

## Tech stack & reasoning

| Layer | Choice | Why this over the alternative |
|---|---|---|
| **Runtime** | Node.js 20 LTS | LTS, mature ecosystem, single language across the stack |
| **HTTP framework** | Express 4 | Boring is good for an assignment — every reviewer knows it. Fastify would be ~2× faster but adds learning curve |
| **Language** | TypeScript (strict) | Catches whole classes of bugs (typoed orgId, missing fields) at compile time |
| **DB** | Postgres (Neon) | Real relational DB. Neon's free tier + branching = no Docker required, fast test isolation |
| **ORM** | Prisma 5 | Type-safe queries, painless migrations, excellent docs. Trade-off: heavier than Drizzle, but the DX wins |
| **Validation** | Zod | One schema → request validation + TS types. Shared mental model on frontend & backend |
| **Auth** | JWT (access + refresh) + bcrypt | Stateless access tokens, DB-tracked refresh tokens for rotation/revocation. Refresh tokens are SHA-256-hashed before storage |
| **Logging** | Winston | Structured JSON in prod, colourised in dev, with request IDs |
| **Rate limiting** | `express-rate-limit` | In-memory is fine for an assignment. Production would back it with Redis |
| **Testing** | Vitest + Supertest | Vitest is fast and modern; Supertest is the canonical Express integration helper |
| **Frontend build** | Vite | Sub-second HMR, no Webpack config to babysit |
| **Frontend framework** | React 18 + React Router 6 | Familiar to every reviewer |
| **Data fetching** | React Query (TanStack) | Cache + invalidation + `placeholderData: prev` for flicker-free pagination |
| **Forms** | react-hook-form + Zod | Uncontrolled inputs (fewer re-renders) + the same Zod schemas as the backend |
| **Styling** | Tailwind CSS | Atomic utilities, zero CSS file maintenance, dark-mode driven by `data-theme` |
| **Icons** | lucide-react | Tree-shakeable, no icon-font bloat |

---

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | ≥ 18.18 (LTS recommended) | Backend + frontend runtime |
| **npm** | bundled with Node | Package management |
| **Git** | any recent | (Optional) version control |
| **Neon account** | free tier | Postgres database |

> No Docker, no local Postgres, no extra services required.

Check your versions:

```bash
node --version    # → v18.x or v20.x
npm --version
```

---

## Setup — Neon + Backend + Frontend

### Step 1 — Create a free Neon Postgres database

1. Go to <https://neon.tech>, sign up, click **Create project**:
   - Project name: `hrms-evallo`
   - Postgres 16, the region closest to you (e.g. `AWS ap-south-1`)
2. On the project dashboard, switch to the **Pooled connection** toggle
   and copy the connection string. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/DB?sslmode=require
   ```

3. **(Recommended)** Create a second branch named `test` from the
   "Branches" tab — copy that pooled URL too. We'll use it to isolate
   the test suite from your dev data.

### Step 2 — Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL` → your dev Neon URL
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → any long random strings.
  Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Then apply the schema, seed demo data, and start the dev server:

```bash
npx prisma generate
npx prisma migrate dev
npm run seed         # populates Acme Corp with 8 employees, 3 teams
npm run dev          # → http://localhost:4000
```

You should see:

```
HH:MM:SS [info] ✅ Database connection verified
HH:MM:SS [info] 🚀 HRMS backend listening on http://localhost:4000
```

Hit <http://localhost:4000/api/v1/health> — you should see `"db": "connected"`.

### Step 3 — Frontend setup

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

Open <http://localhost:5173> and sign in with the seeded credentials:

```
Email:    owner@acme.test
Password: Password123
```

The dashboard, employees, teams, and audit-log pages will already have data.

---

## Running the test suite

The Vitest + Supertest suite covers **20 tests across 4 files** — auth
flows (happy + failure), employees CRUD + 404s + duplicate-email, teams
CRUD + bulk assignment + idempotency, and the all-important multi-tenant
isolation guarantees.

```bash
cd backend

# One-time: configure a test DB (a Neon branch is ideal)
cp .env.test.example .env.test
# → paste the TEST_DATABASE_URL of your Neon `test` branch

# One-time: push the schema to the test branch
DATABASE_URL=$(grep TEST_DATABASE_URL .env.test | cut -d '"' -f2) \
  npx prisma migrate deploy

# Run the whole suite
npm test
```

Expected output: 4 test files, 20 tests, all green, ~10s wall time.

> **No `TEST_DATABASE_URL` set?** Tests fall back to your dev
> `DATABASE_URL` and print a warning. Tests still pass, but they will
> truncate your dev tables between suites — re-run `npm run seed` after.

### Postman / Newman

The full 30-request Postman collection lives at `docs/postman_collection.json`:

```bash
npx -y newman run docs/postman_collection.json
```

Covers register → login → refresh-rotation → employee CRUD → team CRUD
→ M:N assignment → org isolation → owner-only audit-log gate.

---

## Available scripts

### Backend (`cd backend`)

| Script | What it does |
|---|---|
| `npm run dev` | Start with hot reload (ts-node-dev) on port 4000 |
| `npm run build` | TypeScript → `dist/` |
| `npm start` | Run the compiled `dist/server.js` |
| `npm run seed` | Populate the dev DB with the demo Acme Corp tenant |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Re-run tests on file change |
| `npm run lint` | ESLint over `src/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |

### Frontend (`cd frontend`)

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (port 5173) with backend proxy |
| `npm run build` | Production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint over `src/` |
| `npm run typecheck` | `tsc --noEmit` |

---

## Project structure

```
hrms-evallo/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            ← 7 models incl. audit_logs + refresh_tokens
│   │   ├── seed.ts                  ← demo tenant: Acme Corp (Phase 4)
│   │   └── migrations/
│   ├── src/
│   │   ├── config/                  ← env (zod), db (prisma), logger (winston)
│   │   ├── lib/                     ← jwt, password, scope, audit, pagination
│   │   ├── middleware/              ← requireAuth, errorHandler, rateLimit, requestLogger
│   │   ├── modules/
│   │   │   ├── auth/                ← register, login, refresh, logout, me
│   │   │   ├── employees/           ← CRUD with team multi-select
│   │   │   ├── teams/               ← CRUD + bulk-assign + remove-member
│   │   │   ├── auditLogs/           ← filterable read API (OWNER only)
│   │   │   └── health/
│   │   ├── routes/index.ts
│   │   ├── types/express.d.ts       ← req.auth ambient type
│   │   ├── app.ts                   ← Express factory (testable, no listen())
│   │   └── server.ts                ← boot script
│   ├── tests/                       ← Vitest + Supertest (Phase 4)
│   │   ├── setup.ts
│   │   ├── helpers.ts
│   │   ├── auth.test.ts
│   │   ├── employees.test.ts
│   │   ├── teams.test.ts
│   │   └── orgIsolation.test.ts
│   ├── vitest.config.ts             ← Phase 4
│   ├── .env.example
│   ├── .env.test.example            ← Phase 4
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/AppShell.tsx
│   │   │   ├── ui/                  ← Button, Input, Dialog, Table, Toast, …
│   │   │   └── ErrorBoundary.tsx
│   │   ├── context/                 ← AuthContext, ThemeContext
│   │   ├── features/
│   │   │   ├── employees/           ← EmployeeForm, TeamMultiSelect
│   │   │   ├── teams/               ← TeamForm, ManageMembersDialog
│   │   │   └── auditLogs/MetadataDiff.tsx
│   │   ├── hooks/                   ← useDebounce, useEmployees, useTeams, useAuditLogs
│   │   ├── lib/                     ← api (axios + refresh), authApi, employeesApi, …
│   │   ├── pages/                   ← Dashboard, Employees, Teams, AuditLogs, Login, Register
│   │   ├── routes/ProtectedRoute.tsx
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docs/
│   ├── PROJECT_PLAN.html            ← the original master plan
│   ├── postman_collection.json      ← 30 requests, 55 assertions
│   ├── PHASE1_NOTES.md
│   ├── PHASE2_NOTES.md
│   ├── PHASE3_NOTES.md
│   └── PHASE4_NOTES.md              ← Phase 4 engineering notes
│
├── SETUP_GUIDE.md
└── README.md                        ← you are here
```

---

## API documentation

All endpoints are mounted under `/api/v1` and return JSON. Standard list
envelope: `{ data: T[], pagination: { total, page, limit, pages } }`.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create organisation + first OWNER user | — |
| POST | `/auth/login` | Issue access + refresh tokens | — |
| POST | `/auth/refresh` | Rotate refresh token, issue a fresh pair | — |
| POST | `/auth/logout` | Revoke session(s) | Bearer |
| GET | `/auth/me` | Current user + organisation | Bearer |
| GET | `/employees` | Paginated, searchable list (`?page&limit&q`) | Bearer |
| POST | `/employees` | Create (optionally with `teamIds[]`) | Bearer |
| GET | `/employees/:id` | Single employee with assigned teams | Bearer |
| PATCH | `/employees/:id` | Partial update | Bearer |
| DELETE | `/employees/:id` | Delete (cascades team_members) | Bearer |
| GET | `/teams` | Paginated list with `memberCount` | Bearer |
| POST | `/teams` | Create team | Bearer |
| GET | `/teams/:id` | Single team with members | Bearer |
| PATCH | `/teams/:id` | Partial update | Bearer |
| DELETE | `/teams/:id` | Delete (cascades team_members) | Bearer |
| POST | `/teams/:id/members` | Bulk assign employees (transactional, idempotent) | Bearer |
| DELETE | `/teams/:id/members/:employeeId` | Remove one membership | Bearer |
| GET | `/audit-logs` | Filterable log (`action`, `entityType`, `from`, `to`, `userId`) | Bearer + **OWNER** |
| GET | `/health` | Liveness + DB ping | — |

Full request/response examples are in `docs/postman_collection.json`.

---

## Design decisions & trade-offs

**1. 404 instead of 403 on cross-tenant access.**
If org B tries to GET an employee that belongs to org A, we return
`404 NOT_FOUND` — not `403 FORBIDDEN`. Returning 403 would leak the
fact that the resource exists in another tenant. The whole 6-test
isolation suite in `tests/orgIsolation.test.ts` is built around this
guarantee.

**2. Refresh tokens are rotated *and* revoked on every refresh.**
Each refresh mints a brand-new refresh token and marks the old row as
revoked in `refresh_tokens`. If the same refresh token comes in twice
(reuse → likely theft), we conservatively revoke *every* active session
for that user. Tokens are SHA-256-hashed before storage so a DB leak
doesn't immediately compromise sessions.

**3. Single source of truth for shapes — Zod schemas.**
Every endpoint's `*.schema.ts` exports both the runtime validator and
the inferred TypeScript type. The controller does `Schema.parse(req.body)`
and the rest of the handler is strongly typed for free. The frontend
uses the same Zod patterns in `react-hook-form` so a server 422 is a
genuine business conflict (e.g. duplicate email), not a UX gap.

**4. Optimistic-ish pagination with React Query's `placeholderData: prev`.**
When you jump from page 2 to page 3 of the employees table, the previous
page stays visible *while* the next page loads — so the user never sees
a flash of skeleton rows for content they already had context for.

**5. Dark-mode via `data-theme` attribute, not `class="dark"`.**
The product was designed dark-first using arbitrary Tailwind colour values.
Retrofitting every surface into `dark:` variants would touch dozens of
files for marginal benefit. Instead, an attribute-scoped override layer
in `src/index.css` recolours the most common hex values when
`data-theme="light"`. The Tailwind config still supports `dark:` for
any future styles. Trade-off: not a "complete" Tailwind theming setup,
but ships faster.

**6. Tests use a real Postgres, not a mock.**
The whole point of testing a multi-tenant API is to prove the tenant
guard works against actual SQL. We use a separate Neon branch for tests
(takes ~5 seconds to create — way better than spinning up local Postgres).

**7. Real DB writes in `audit_logs` for every meaningful action.**
Mutations record a `{ before, after }` diff in `metadata` so the
frontend can render a two-column diff view. Failed logins record a
row too (with `userId = null`) so security teams can spot brute-force
attempts. Audit writes are best-effort: a failure there never bubbles
up to fail the user request.

**8. JWT + Bearer instead of httpOnly cookies.**
Bearer tokens keep the frontend deploy story simple (no shared parent
domain required, no CSRF) at the cost of LocalStorage exposure. The
15-minute access TTL minimises the damage window, and refresh tokens
never touch the regular API surface — they only travel to
`/auth/refresh`.

---

## What I'd do with more time

- **Frontend tests** — Vitest + React Testing Library for the
  Employees/Teams pages, especially the dialogs.
- **Playwright E2E** — one happy-path script that registers, adds an
  employee, creates a team, and asserts the audit log. The killer
  reviewer demo.
- **Richer RBAC** — split MEMBER into EDITOR vs VIEWER, gate mutations
  in the UI as well as the API. Currently only OWNER and MEMBER exist.
- **OpenAPI / Swagger UI** — generate the spec from the Zod schemas
  and host it on `/api/v1/docs`. Postman is good, OpenAPI is better.
- **File uploads** — employee avatars via S3 / R2 presigned URLs.
- **Soft deletes + history** — `deletedAt` instead of `DELETE`, so the
  audit trail keeps referential integrity.
- **Redis-backed rate limiting** — the current in-memory limiter works
  for one Node process but doesn't survive a restart or scale to
  multiple instances.
- **Observability** — wire Winston into Datadog/Logtail, expose a
  Prometheus `/metrics` endpoint.

---

## Deployment

Not deployed by default — this assignment is being submitted running
locally. The configs to deploy are committed and the runbook is in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md):

- **Backend → Render** via `backend/render.yaml` (one-click Blueprint).
- **Frontend → Vercel** via `frontend/vercel.json`.
- **Database** → same Neon project (the free tier handles dev + prod
  comfortably for an assignment).

End-to-end deployment takes ~20 minutes on free tiers.

---

## Troubleshooting

<details>
<summary><strong>"Invalid environment variables" on backend start</strong></summary>

The Zod env validator caught a missing or bad value in `.env`. The
error output tells you which field is the problem. Most common:
`DATABASE_URL` not a valid URL, or one of the JWT secrets shorter than
32 characters.
</details>

<details>
<summary><strong>Backend says "Could not connect to the database"</strong></summary>

1. Double-check `DATABASE_URL` is the **pooled** connection string
   from Neon, with `?sslmode=require` at the end.
2. Visit your Neon console — if the project is paused, run any query
   in the SQL editor to wake it (free-tier Neon auto-suspends after
   ~5 min of idle).
</details>

<details>
<summary><strong>Frontend shows "Backend unreachable"</strong></summary>

The backend isn't running, or it's running on a different port. Confirm
the backend terminal shows `🚀 HRMS backend listening on http://localhost:4000`.
If you changed `PORT` in `.env`, also update the proxy target in
`frontend/vite.config.ts`.
</details>

<details>
<summary><strong>Tests fail with "relation does not exist"</strong></summary>

The test database doesn't have the schema applied yet. From
`backend/`:

```bash
DATABASE_URL=$(grep TEST_DATABASE_URL .env.test | cut -d '"' -f2) \
  npx prisma migrate deploy
```
</details>

<details>
<summary><strong>Seed says "P2002 unique constraint failed"</strong></summary>

This shouldn't happen — the seed is idempotent. If it does, your DB is
in an inconsistent state from a previous half-run. Reset with
`npx prisma migrate reset` (⚠ drops all data) and re-seed.
</details>

<details>
<summary><strong>Port 4000 or 5173 already in use</strong></summary>

- Backend: change `PORT` in `backend/.env` and update the proxy target
  in `frontend/vite.config.ts`.
- Frontend: `npm run dev -- --port 5174` then update `CORS_ORIGIN` in
  `backend/.env`.
</details>

---

## License

Submitted as an interview assignment for Evallo — not licensed for public use.

## Contact

**Manish Kumar** — [your-email@example.com] · [your-github-handle]
