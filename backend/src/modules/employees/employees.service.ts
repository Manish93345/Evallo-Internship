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
import type { CreateEmployeeInput, UpdateEmployeeInput } from './employees.schema';

/**
 * Business logic for Employees.
 *
 *   • Every query is scoped to `organisationId` via `scopeToOrg`.
 *   • A NOT-FOUND on a cross-tenant ID intentionally returns 404, not 403,
 *     so we don't leak whether the resource exists in another org.
 *   • Mutations write a row to `audit_logs` with a before/after diff so the
 *     reviewer can replay history.
 */

// Public shape we return to clients — never include internal fields by accident.
type EmployeeWithTeams = Prisma.EmployeeGetPayload<{
  include: {
    teamMembers: {
      include: { team: { select: { id: true; name: true } } };
    };
  };
}>;

function presentEmployee(e: EmployeeWithTeams) {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    position: e.position,
    joinedAt: e.joinedAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    teams: e.teamMembers.map((tm) => ({ id: tm.team.id, name: tm.team.name })),
  };
}

// ---------- LIST ----------

export async function listEmployees(
  organisationId: string,
  query: PaginationQuery,
): Promise<Paginated<ReturnType<typeof presentEmployee>>> {
  const { page, limit, q } = query;
  const { skip, take } = pageToSkipTake(page, limit);

  const where: Prisma.EmployeeWhereInput = scopeToOrg(
    q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { position: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    organisationId,
  );

  // Run count + page query in a single round-trip.
  const [total, rows] = await prisma.$transaction([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        teamMembers: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  return {
    data: rows.map(presentEmployee),
    pagination: buildPagination(total, page, limit),
  };
}

// ---------- GET ONE ----------

export async function getEmployee(organisationId: string, id: string) {
  const employee = await prisma.employee.findFirst({
    where: scopeToOrg({ id }, organisationId),
    include: {
      teamMembers: {
        include: { team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!employee) throw ApiError.notFound('Employee not found');
  return presentEmployee(employee);
}

// ---------- CREATE ----------

export async function createEmployee(
  organisationId: string,
  userId: string,
  input: CreateEmployeeInput,
  req: Request,
) {
  // If teams were requested, verify ALL of them belong to this org BEFORE
  // creating anything. Prevents cross-tenant team-id leak via the assignment.
  if (input.teamIds && input.teamIds.length > 0) {
    const teams = await prisma.team.findMany({
      where: { id: { in: input.teamIds }, organisationId },
      select: { id: true },
    });
    if (teams.length !== input.teamIds.length) {
      throw ApiError.badRequest('One or more teamIds are invalid for this organisation.');
    }
  }

  const created = await prisma
    .$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          organisationId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          position: input.position ?? null,
          joinedAt: input.joinedAt ?? null,
        },
      });

      if (input.teamIds && input.teamIds.length > 0) {
        await tx.teamMember.createMany({
          data: input.teamIds.map((teamId) => ({ employeeId: employee.id, teamId })),
          skipDuplicates: true,
        });
      }

      return tx.employee.findUniqueOrThrow({
        where: { id: employee.id },
        include: {
          teamMembers: {
            include: { team: { select: { id: true, name: true } } },
          },
        },
      });
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('An employee with this email already exists in your organisation.');
      }
      throw err;
    });

  await logAudit({
    organisationId,
    userId,
    action: 'EMPLOYEE_CREATED',
    entityType: EntityType.EMPLOYEE,
    entityId: created.id,
    metadata: {
      after: {
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        position: created.position,
        joinedAt: created.joinedAt,
        teamIds: created.teamMembers.map((tm) => tm.teamId),
      },
    },
    req,
  });

  return presentEmployee(created);
}

// ---------- UPDATE ----------

export async function updateEmployee(
  organisationId: string,
  userId: string,
  id: string,
  input: UpdateEmployeeInput,
  req: Request,
) {
  const before = await prisma.employee.findFirst({
    where: scopeToOrg({ id }, organisationId),
  });
  if (!before) throw ApiError.notFound('Employee not found');

  const updateData: Prisma.EmployeeUpdateInput = {};
  if (input.firstName !== undefined) updateData.firstName = input.firstName;
  if (input.lastName !== undefined) updateData.lastName = input.lastName;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.position !== undefined) updateData.position = input.position ?? null;
  if (input.joinedAt !== undefined) updateData.joinedAt = input.joinedAt; // can be Date or null

  const updated = await prisma.employee
    .update({
      where: { id },
      data: updateData,
      include: {
        teamMembers: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('Another employee in your organisation already has that email.');
      }
      throw err;
    });

  // Compute the diff so reviewers can replay history from audit_logs.
  const beforeSnap = {
    firstName: before.firstName,
    lastName: before.lastName,
    email: before.email,
    position: before.position,
    joinedAt: before.joinedAt,
  };
  const afterSnap = {
    firstName: updated.firstName,
    lastName: updated.lastName,
    email: updated.email,
    position: updated.position,
    joinedAt: updated.joinedAt,
  };

  await logAudit({
    organisationId,
    userId,
    action: 'EMPLOYEE_UPDATED',
    entityType: EntityType.EMPLOYEE,
    entityId: updated.id,
    metadata: { before: beforeSnap, after: afterSnap },
    req,
  });

  return presentEmployee(updated);
}

// ---------- DELETE ----------

export async function deleteEmployee(
  organisationId: string,
  userId: string,
  id: string,
  req: Request,
) {
  const existing = await prisma.employee.findFirst({
    where: scopeToOrg({ id }, organisationId),
    include: { teamMembers: { select: { teamId: true } } },
  });
  if (!existing) throw ApiError.notFound('Employee not found');

  // ON DELETE CASCADE on team_members handles the junction rows for us.
  await prisma.employee.delete({ where: { id } });

  await logAudit({
    organisationId,
    userId,
    action: 'EMPLOYEE_DELETED',
    entityType: EntityType.EMPLOYEE,
    entityId: existing.id,
    metadata: {
      before: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        position: existing.position,
        joinedAt: existing.joinedAt,
        teamIds: existing.teamMembers.map((tm) => tm.teamId),
      },
    },
    req,
  });
}
