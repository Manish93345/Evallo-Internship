/**
 * Prisma seed — Phase 4
 *
 * Populates a demo organisation so a reviewer can run `npm run seed` and
 * immediately explore the product without clicking through registration +
 * manual entry.
 *
 * What this creates (idempotent — safe to re-run):
 *   • 1 organisation        → "Acme Corp"
 *   • 2 users               → owner + member, both with known passwords
 *   • 8 employees           → realistic names + positions
 *   • 3 teams               → Engineering, Design, People Ops
 *   • Sample assignments    → most employees mapped to 1–2 teams
 *
 * Demo credentials are printed at the end. Use them on the /login page.
 *
 * Idempotency: every record is upserted by a stable natural key (email for
 * users + employees, name for teams), so re-running this script just
 * refreshes the dataset rather than duplicating it.
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ---------- Constants ----------

const ORG = { name: 'Acme Corp', slug: 'acme-corp' };

const OWNER = {
  email: 'owner@acme.test',
  name: 'Aria Owner',
  password: 'Password123',
};

const MEMBER = {
  email: 'member@acme.test',
  name: 'Mason Member',
  password: 'Password123',
};

const EMPLOYEES = [
  { firstName: 'Riya',    lastName: 'Sharma',   email: 'riya.sharma@acme.test',    position: 'Senior Backend Engineer',  team: ['Engineering'] },
  { firstName: 'Arjun',   lastName: 'Mehta',    email: 'arjun.mehta@acme.test',    position: 'Staff Frontend Engineer',  team: ['Engineering'] },
  { firstName: 'Priya',   lastName: 'Iyer',     email: 'priya.iyer@acme.test',     position: 'Engineering Manager',      team: ['Engineering', 'People Ops'] },
  { firstName: 'Karan',   lastName: 'Verma',    email: 'karan.verma@acme.test',    position: 'Product Designer',         team: ['Design'] },
  { firstName: 'Neha',    lastName: 'Kapoor',   email: 'neha.kapoor@acme.test',    position: 'Design Lead',              team: ['Design'] },
  { firstName: 'Aditya',  lastName: 'Rao',      email: 'aditya.rao@acme.test',     position: 'DevOps Engineer',          team: ['Engineering'] },
  { firstName: 'Simran',  lastName: 'Bose',     email: 'simran.bose@acme.test',    position: 'People Partner',           team: ['People Ops'] },
  { firstName: 'Vikram',  lastName: 'Singh',    email: 'vikram.singh@acme.test',   position: 'Recruiter',                team: ['People Ops', 'Design'] },
];

const TEAMS = [
  { name: 'Engineering', description: 'Backend, frontend & infra — ships the product.' },
  { name: 'Design',      description: 'Product design, brand, and design ops.' },
  { name: 'People Ops',  description: 'Hiring, onboarding, and culture.' },
];

// Stable "joined at" so consecutive runs don't shuffle the timeline.
const BASE_JOIN = new Date('2024-01-15T00:00:00.000Z');
function joinDate(daysOffset: number): Date {
  const d = new Date(BASE_JOIN);
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d;
}

// ---------- Helpers ----------

function divider(title: string) {
  // eslint-disable-next-line no-console
  console.log(`\n── ${title} ──`);
}

// ---------- Main ----------

async function main() {
  divider('Seeding HRMS demo data');

  // 1) Organisation -----------------------------------------------------------
  const org = await prisma.organisation.upsert({
    where: { slug: ORG.slug },
    update: { name: ORG.name },
    create: { name: ORG.name, slug: ORG.slug },
  });
  // eslint-disable-next-line no-console
  console.log(`✓ Organisation ready: ${org.name}  (id: ${org.id})`);

  // 2) Users (owner + member) -------------------------------------------------
  const ownerHash = await bcrypt.hash(OWNER.password, 12);
  const memberHash = await bcrypt.hash(MEMBER.password, 12);

  const ownerUser = await prisma.user.upsert({
    where: { email: OWNER.email },
    update: { name: OWNER.name, passwordHash: ownerHash, role: Role.OWNER, organisationId: org.id },
    create: {
      email: OWNER.email,
      name: OWNER.name,
      passwordHash: ownerHash,
      role: Role.OWNER,
      organisationId: org.id,
    },
  });
  await prisma.user.upsert({
    where: { email: MEMBER.email },
    update: { name: MEMBER.name, passwordHash: memberHash, role: Role.MEMBER, organisationId: org.id },
    create: {
      email: MEMBER.email,
      name: MEMBER.name,
      passwordHash: memberHash,
      role: Role.MEMBER,
      organisationId: org.id,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`✓ Users ready: ${OWNER.email} (OWNER), ${MEMBER.email} (MEMBER)`);

  // 3) Teams ------------------------------------------------------------------
  const teamByName = new Map<string, string>();
  for (const t of TEAMS) {
    const team = await prisma.team.upsert({
      where: { organisationId_name: { organisationId: org.id, name: t.name } },
      update: { description: t.description },
      create: {
        organisationId: org.id,
        name: t.name,
        description: t.description,
      },
    });
    teamByName.set(team.name, team.id);
  }
  // eslint-disable-next-line no-console
  console.log(`✓ ${TEAMS.length} teams ready: ${TEAMS.map((t) => t.name).join(', ')}`);

  // 4) Employees + assignments ------------------------------------------------
  let createdCount = 0;
  let updatedCount = 0;
  let assignmentCount = 0;

  for (let i = 0; i < EMPLOYEES.length; i += 1) {
    const e = EMPLOYEES[i];

    // Detect "is this a new row?" so we can report nicer counts at the end.
    const existing = await prisma.employee.findUnique({
      where: { organisationId_email: { organisationId: org.id, email: e.email } },
      select: { id: true },
    });

    const employee = await prisma.employee.upsert({
      where: { organisationId_email: { organisationId: org.id, email: e.email } },
      update: {
        firstName: e.firstName,
        lastName: e.lastName,
        position: e.position,
        joinedAt: joinDate(i * 11),
      },
      create: {
        organisationId: org.id,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        position: e.position,
        joinedAt: joinDate(i * 11),
      },
    });
    if (existing) updatedCount += 1;
    else createdCount += 1;

    // Sync team memberships exactly to `e.team` (idempotent).
    const desiredTeamIds = e.team
      .map((name) => teamByName.get(name))
      .filter((id): id is string => Boolean(id));

    if (desiredTeamIds.length > 0) {
      await prisma.teamMember.createMany({
        data: desiredTeamIds.map((teamId) => ({ employeeId: employee.id, teamId })),
        skipDuplicates: true,
      });
      assignmentCount += desiredTeamIds.length;
    }
  }
  // eslint-disable-next-line no-console
  console.log(
    `✓ Employees: ${createdCount} created, ${updatedCount} refreshed (${EMPLOYEES.length} total)`,
  );
  // eslint-disable-next-line no-console
  console.log(`✓ Team-member assignments ensured: ${assignmentCount}`);

  // 5) One representative audit-log row so the page isn't empty on first load
  await prisma.auditLog.create({
    data: {
      organisationId: org.id,
      userId: ownerUser.id,
      action: 'SEED_RAN',
      entityType: 'ORGANISATION',
      entityId: org.id,
      metadata: {
        note: 'Demo data refreshed via `npm run seed`',
        employees: EMPLOYEES.length,
        teams: TEAMS.length,
      },
    },
  });

  // 6) Print credentials so the reviewer can log straight in. -----------------
  divider('Demo credentials');
  // eslint-disable-next-line no-console
  console.log('OWNER  →  email: owner@acme.test   password: Password123');
  // eslint-disable-next-line no-console
  console.log('MEMBER →  email: member@acme.test  password: Password123');
  // eslint-disable-next-line no-console
  console.log('\nOpen http://localhost:5173 and sign in — the dashboard will already have data. 🌱\n');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('\n❌ Seed failed:\n', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
