import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import {
  buildPagination,
  pageToSkipTake,
  type Paginated,
} from '../../lib/pagination';
import { scopeToOrg } from '../../lib/scope';
import type { AuditLogQuery } from './auditLogs.schema';

/**
 * Paginated, filterable read over `audit_logs`.
 *
 *   • Always org-scoped via `scopeToOrg`.
 *   • Ordered by createdAt DESC (the index supports this directly).
 *   • Returns a denormalised `user` so the UI can render "Manish did X" with
 *     a single round-trip.
 */
export async function listAuditLogs(
  organisationId: string,
  query: AuditLogQuery,
): Promise<
  Paginated<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Prisma.JsonValue;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    user: { id: string; name: string; email: string } | null;
  }>
> {
  const { page, limit, action, entityType, userId, from, to } = query;
  const { skip, take } = pageToSkipTake(page, limit);

  const filters: Prisma.AuditLogWhereInput = {};
  if (action) filters.action = action;
  if (entityType) filters.entityType = entityType;
  if (userId) filters.userId = userId;
  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.gte = from;
    if (to) filters.createdAt.lte = to;
  }

  const where: Prisma.AuditLogWhereInput = scopeToOrg(filters, organisationId);

  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      user: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
    })),
    pagination: buildPagination(total, page, limit),
  };
}
