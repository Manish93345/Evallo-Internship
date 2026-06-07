# HRMS — Evallo Full-Stack Assignment

> A multi-tenant Human Resource Management System with organisation-scoped
> employee & team management, JWT auth, and a full audit trail.
> Built with **Node.js + Express + TypeScript** on the backend, **React + Vite + TypeScript** on the frontend, and **Neon Postgres + Prisma** for data.

**Author:** Manish Kumar
**Submitted to:** Evallo · Round 3 Full-Stack Engineer
**Status:** Phase 0 + Phase 1 complete · Phases 2–4 in `docs/PROJECT_PLAN.html`

---

## 📋 Table of contents

1. [What's in this repo right now (Phase 0)](#whats-in-this-repo-right-now-phase-0)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Create a free Neon Postgres database](#step-1--create-a-free-neon-postgres-database)
4. [Step 2 — Backend setup](#step-2--backend-setup)
5. [Step 3 — Frontend setup](#step-3--frontend-setup)
6. [Step 4 — Verify everything is wired up](#step-4--verify-everything-is-wired-up)
7. [Project structure](#project-structure)
8. [Roadmap (Phases 1–4)](#roadmap-phases-14)
9. [Troubleshooting](#troubleshooting)

---

## What's in this repo right now (Phases 0 + 1)

**Phase 0 — Foundation:**
- ✅ Monorepo (`backend/`, `frontend/`, `docs/`)
- ✅ Backend boots: Express + TypeScript, structured Winston logging, Helmet, CORS, request IDs, global error handler
- ✅ Frontend boots: React 18 + Vite + TypeScript + TailwindCSS
- ✅ Prisma connected to Neon Postgres (`/api/v1/health` actually queries the DB)
- ✅ Env validation with Zod (fails fast on misconfig)
- ✅ Graceful shutdown, request logging, no `console.log` debris

**Phase 1 — Data & Auth:**
- ✅ Full Prisma schema: `organisations`, `users`, `employees`, `teams`, `team_members` (junction), `audit_logs`, `refresh_tokens`
- ✅ Auth endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- ✅ JWT access (15m) + refresh (7d), refresh tokens **rotated and hashed in DB** (revocation + reuse detection)
- ✅ bcrypt (12 rounds), timing-safe login (no email enumeration)
- ✅ `requireAuth` middleware attaches `req.auth.organisationId` for multi-tenant scoping
- ✅ Per-route rate limiting (auth: 20 / 15 min · general API: 300 / min)
- ✅ `audit_logs` populated for every auth event (success + failure)
- ✅ Frontend: Login + Register pages, `AuthContext`, protected routes, axios interceptor with silent 401-refresh
- ✅ Postman collection in `docs/postman_collection.json` — 9-step end-to-end test
- ✅ Engineering notes in `docs/PHASE1_NOTES.md`

The full phase plan with API surface, schema, and per-phase deliverables is in `docs/PROJECT_PLAN.html` — open it in any browser.

---

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | ≥ 18.18 (LTS recommended) | Backend + frontend runtime |
| **npm** | comes with Node | Package management |
| **Git** | any recent | (Optional) version control |
| **A Neon account** | free tier | Postgres database |

> No Docker, no local Postgres install, no extra services required.

Check your versions:

```bash
node --version    # should print v18.x or v20.x
npm --version
```

---

## Step 1 — Create a free Neon Postgres database

Neon gives you a real Postgres database in about 30 seconds, with a generous free tier. It's the easiest way to skip Docker entirely.

1. Go to **<https://neon.tech>** and sign up (Google/GitHub login works).
2. Click **"Create project"**.
   - **Project name:** `hrms-evallo` (anything you like)
   - **Postgres version:** 16 (default is fine)
   - **Region:** pick the one closest to you (e.g. `AWS ap-south-1` for India)
3. After it's created, Neon shows you a **Connection string**. Click the **"Pooled connection"** toggle — Prisma works best with the pooled connection string. It looks like this:

   ```
   postgresql://hrms_owner:AbCd1234XYZ@ep-cool-mountain-12345-pooler.ap-south-1.aws.neon.tech/hrms?sslmode=require
   ```

4. **Copy that string** — you'll paste it into `backend/.env` in the next step. (You can always come back to the Neon console to find it again under *Dashboard → Connection Details*.)

> 💡 **Note:** Neon auto-suspends idle databases after ~5 minutes on the free tier. The first request after a pause takes ~1 second to wake it up — totally normal.

---

## Step 2 — Backend setup

From the project root:

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Now open `backend/.env` in your editor and fill in:

- `DATABASE_URL` — paste the Neon connection string from Step 1
- `JWT_ACCESS_SECRET` — any long random string. Quick way to generate one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `JWT_REFRESH_SECRET` — a *different* random string, generated the same way

Push the schema to Neon (creates all 7 tables — organisations, users, employees, teams, team_members, audit_logs, refresh_tokens):

```bash
npx prisma generate
npx prisma migrate dev --name phase1_init
```

You should see:

```
✔ Generated Prisma Client
✔ Applied migration 20260606_phase1_init
```

Start the backend in dev mode:

```bash
npm run dev
```

You should see:

```
HH:MM:SS [info] ✅ Database connection verified
HH:MM:SS [info] 🚀 HRMS backend listening on http://localhost:4000
HH:MM:SS [info]    Environment: development
HH:MM:SS [info]    Health:      http://localhost:4000/api/v1/health
```

Open <http://localhost:4000/api/v1/health> in your browser — you should see JSON with `"db": "connected"`.

---

## Step 3 — Frontend setup

**Open a second terminal**, leaving the backend running:

```bash
cd frontend
npm install
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in 400 ms
  ➜  Local:   http://localhost:5173/
```

---

## Step 4 — Verify everything is wired up

Open **<http://localhost:5173>** in your browser.

You'll land on the **Sign in** page. To verify Phase 1 end-to-end:

1. Click **Register** at the bottom of the login card.
2. Create an organisation (e.g. *Acme Corp*) with your name, email and a password (≥ 8 chars, 1 letter + 1 digit).
3. You'll be redirected to the dashboard, which shows:
   - 🟢 Your authenticated user + organisation
   - 🟢 Backend `ok` · Database `connected`
   - Three placeholder cards for Employees / Teams / Audit Log (Phase 2/3)
4. Click **Sign out** in the top right — you're redirected back to `/login`. The refresh token is now revoked server-side.

### Running the Postman test suite

The Postman collection covers **9 scenarios** including refresh-token rotation, post-logout invalidation, and bad-password handling:

```bash
npx -y newman run docs/postman_collection.json
```

All 9 requests should print green ticks.

### Inspecting the audit log

Every auth event is recorded. To see them:

```bash
cd backend
npx prisma studio
```

Then open the `audit_logs` table — you'll see `ORG_REGISTERED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `REFRESH_SUCCESS`, `LOGOUT` rows with IP, user-agent, and JSON metadata.

---

## Project structure

```
hrms-evallo/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (Phase 0: Org + User)
│   ├── src/
│   │   ├── config/                # env validation, db client, logger
│   │   │   ├── db.ts
│   │   │   ├── env.ts
│   │   │   └── logger.ts
│   │   ├── middleware/            # error handler, request logger
│   │   │   ├── errorHandler.ts
│   │   │   └── requestLogger.ts
│   │   ├── modules/               # Feature modules (one folder per feature)
│   │   │   └── health/
│   │   │       └── health.routes.ts
│   │   ├── routes/
│   │   │   └── index.ts           # Combines all module routers under /api/v1
│   │   ├── utils/
│   │   │   ├── ApiError.ts
│   │   │   └── asyncHandler.ts
│   │   ├── app.ts                 # Express app factory (testable)
│   │   └── server.ts              # Boot script
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts             # Axios instance
│   │   ├── App.tsx                # Phase 0 status page
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docs/
│   └── PROJECT_PLAN.html          # ⭐ Full 5-phase build plan — open in browser
│
└── README.md                      # ← you are here
```

---

## Roadmap (Phases 1–4)

The full plan lives in **[`docs/PROJECT_PLAN.html`](docs/PROJECT_PLAN.html)** — open it in any browser for the detailed version. Quick summary:

| Phase | Focus | Effort |
|------|-------|------|
| **✅ Phase 0** | Foundation: monorepo, TS, Neon connection, health check | ~2–3h |
| **✅ Phase 1** | DB schema (Employee, Team, M:N junction, AuditLog, RefreshToken) + JWT auth (register/login/refresh/logout/me) + frontend auth scaffold | ~3–4h |
| **Phase 2** | Backend CRUD: employees, teams, team-member assignments, audit log API, pagination, multi-tenant isolation | ~4–5h |
| **Phase 3** | Frontend: dashboard, employees & teams pages with forms, audit log viewer | ~4–5h |
| **Phase 4** | Polish: tests (Vitest + Supertest), seed script, README screenshots, deployment (Render + Vercel), final sweep | ~2–3h |

---

## Troubleshooting

<details>
<summary><strong>"Invalid environment variables" on backend start</strong></summary>

The env validator caught a missing or bad value in `.env`. The error output tells you which field is the problem. Most common: `DATABASE_URL` not a valid URL, or one of the JWT secrets shorter than 32 characters.
</details>

<details>
<summary><strong>Backend says "Could not connect to the database"</strong></summary>

1. Double-check `DATABASE_URL` is the **pooled** connection string from Neon, with `?sslmode=require` at the end.
2. Visit your Neon console — if the project is paused, run any query in the SQL editor to wake it.
3. Check that no firewall is blocking outbound 443 to `*.neon.tech`.
</details>

<details>
<summary><strong>Frontend shows "Backend unreachable"</strong></summary>

The backend isn't running, or it's running on a different port. Confirm the backend terminal shows `🚀 HRMS backend listening on http://localhost:4000`. If you changed `PORT` in `.env`, also update `vite.config.ts`'s proxy target.
</details>

<details>
<summary><strong>Prisma migrate error: "P1001: Can't reach database server"</strong></summary>

Same as above — `DATABASE_URL` is wrong or Neon is paused. The `?sslmode=require` query param is mandatory.
</details>

<details>
<summary><strong>Port 4000 or 5173 already in use</strong></summary>

- Backend: change `PORT` in `backend/.env` and update the proxy target in `frontend/vite.config.ts`.
- Frontend: `npm run dev -- --port 5174` then update `CORS_ORIGIN` in `backend/.env`.
</details>

---

## License

Submitted as an interview assignment for Evallo — not licensed for public use.

## Contact

**Manish Kumar** — [your-email@example.com] · [your-github-handle]
