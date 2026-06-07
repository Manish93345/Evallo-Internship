import type { Request } from 'express';
import { EntityType, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../../lib/audit';
import { scopeToOrg } from '../../lib/scope';
import {
  buildPagination,
  pageToSkipTake,
  type PaginationQuery,
  type Paginated,
} from '../../lib/pagination';
import type { CreateTeamInput, UpdateTeamInput } from './teams.schema';

/**
 * Business logic for Teams + team membership.
 *
 *   • Every query is org-scoped via `scopeToOrg`.
 *   • Listing returns a memberCount for the UI without paying the cost of
 *     loading every junction row.
 *   • The assignment endpoint accepts an array of employeeIds and runs as a
 *     single transaction so a partial failure can't leave half-assigned rows.
 */

// ---------- LIST ----------

export async function listTeams(organisationId: string, query: PaginationQuery): Promise<
  Paginated<{
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const { page, limit, q } = query;
  const { skip, take } = pageToSkipTake(page, limit);

  const where: Prisma.TeamWhereInput = scopeToOrg(
    q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    organisationId,
  );

  const [total, rows] = await prisma.$transaction([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { _count: { select: { members: true } } },
    }),
  ]);

  return {
    data: rows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      memberCount: t._count.members,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    pagination: buildPagination(total, page, limit),
  };
}

// ---------- GET ONE ----------

export async function getTeam(organisationId: string, id: string) {
  const team = await prisma.team.findFirst({
    where: scopeToOrg({ id }, organisationId),
    include: {
      members: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });
  if (!team) throw ApiError.notFound('Team not found');

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    members: team.members.map((m) => ({
      ...m.employee,
      assignedAt: m.assignedAt,
    })),
  };
}

// ---------- CREATE ----------

export async function createTeam(
  organisationId: string,
  userId: string,
  input: CreateTeamInput,
  req: Request,
) {
  const team = await prisma.team
    .create({
      data: {
        organisationId,
        name: input.name,
        description: input.description ?? null,
      },
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('A team with that name already exists in your organisation.');
      }
      throw err;
    });

  await logAudit({
    organisationId,
    userId,
    action: 'TEAM_CREATED',
    entityType: EntityType.TEAM,
    entityId: team.id,
    metadata: { after: { name: team.name, description: team.description } },
    req,
  });

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    members: [],
  };
}

// ---------- UPDATE ----------

export async function updateTeam(
  organisationId: string,
  userId: string,
  id: string,
  input: UpdateTeamInput,
  req: Request,
) {
  const before = await prisma.team.findFirst({ where: scopeToOrg({ id }, organisationId) });
  if (!before) throw ApiError.notFound('Team not found');

  const data: Prisma.TeamUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description; // can be null

  const updated = await prisma.team
    .update({ where: { id }, data })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('Another team in your organisation already has that name.');
      }
      throw err;
    });

  await logAudit({
    organisationId,
    userId,
    action: 'TEAM_UPDATED',
    entityType: EntityType.TEAM,
    entityId: updated.id,
    metadata: {
      before: { name: before.name, description: before.description },
      after: { name: updated.name, description: updated.description },
    },
    req,
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

// ---------- DELETE ----------

export async function deleteTeam(
  organisationId: string,
  userId: string,
  id: string,
  req: Request,
) {
  const existing = await prisma.team.findFirst({
    where: scopeToOrg({ id }, organisationId),
    include: { members: { select: { employeeId: true } } },
  });
  if (!existing) throw ApiError.notFound('Team not found');

  // Cascade on team_members.team_id handles the junction rows.
  await prisma.team.delete({ where: { id } });

  await logAudit({
    organisationId,
    userId,
    action: 'TEAM_DELETED',
    entityType: EntityType.TEAM,
    entityId: existing.id,
    metadata: {
      before: {
        name: existing.name,
        description: existing.description,
        memberIds: existing.members.map((m) => m.employeeId),
      },
    },
    req,
  });
}

// ---------- ASSIGN MEMBERS ----------

/**
 * POST /teams/:id/members  { employeeIds: [...] }
 *
 * Runs in one transaction:
 *   1. Verify the team belongs to this org.
 *   2. Verify every employeeId belongs to this org.
 *   3. createMany with skipDuplicates so re-assigning is idempotent.
 *
 * Returns the team's full updated member list so the UI can refresh in place.
 */
export async function assignMembers(
  organisationId: string,
  userId: string,
  teamId: string,
  employeeIds: string[],
  req: Request,
) {
  // Deduplicate input — saves the DB a round-trip and audit noise.
  const uniqueIds = Array.from(new Set(employeeIds));

  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.team.findFirst({ where: scopeToOrg({ id: teamId }, organisationId) });
    if (!team) throw ApiError.notFound('Team not found');

    const employees = await tx.employee.findMany({
      where: { id: { in: uniqueIds }, organisationId },
      select: { id: true },
    });
    if (employees.length !== uniqueIds.length) {
      throw ApiError.badRequest('One or more employeeIds are invalid for this organisation.');
    }

    // Existing memberships — we want to know which are *new* so the audit
    // entry is accurate (and so we can return a meaningful `addedCount`).
    const existing = await tx.teamMember.findMany({
      where: { teamId, employeeId: { in: uniqueIds } },
      select: { employeeId: true },
    });
    const existingSet = new Set(existing.map((r) => r.employeeId));
    const newlyAdded = uniqueIds.filter((id) => !existingSet.has(id));

    if (newlyAdded.length > 0) {
      await tx.teamMember.createMany({
        data: newlyAdded.map((employeeId) => ({ teamId, employeeId })),
        skipDuplicates: true,
      });
    }

    const updatedTeam = await tx.team.findUniqueOrThrow({
      where: { id: teamId },
      include: {
        members: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true, position: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    return { team: updatedTeam, newlyAdded };
  });

  await logAudit({
    organisationId,
    userId,
    action: 'TEAM_MEMBERS_ASSIGNED',
    entityType: EntityType.TEAM_MEMBER,
    entityId: teamId,
    metadata: {
      teamId,
      requestedEmployeeIds: uniqueIds,
      addedEmployeeIds: result.newlyAdded,
      addedCount: result.newlyAdded.length,
    },
    req,
  });

  return {
    teamId: result.team.id,
    addedCount: result.newlyAdded.length,
    members: result.team.members.map((m) => ({
      ...m.employee,
      assignedAt: m.assignedAt,
    })),
  };
}

// ---------- REMOVE MEMBER ----------

/**
 * DELETE /teams/:id/members/:employeeId
 */
export async function removeMember(
  organisationId: string,
  userId: string,
  teamId: string,
  employeeId: string,
  req: Request,
) {
  // Org guard — verify the team belongs to this tenant FIRST. If it doesn't,
  // we return 404 (not 403) so we don't leak whether the team exists at all.
  const team = await prisma.team.findFirst({ where: scopeToOrg({ id: teamId }, organisationId) });
  if (!team) throw ApiError.notFound('Team not found');

  const membership = await prisma.teamMember.findUnique({
    where: { employeeId_teamId: { employeeId, teamId } },
  });
  if (!membership) throw ApiError.notFound('Employee is not a member of this team');

  await prisma.teamMember.delete({
    where: { employeeId_teamId: { employeeId, teamId } },
  });

  await logAudit({
    organisationId,
    userId,
    action: 'TEAM_MEMBER_REMOVED',
    entityType: EntityType.TEAM_MEMBER,
    entityId: teamId,
    metadata: { teamId, employeeId },
    req,
  });
}
