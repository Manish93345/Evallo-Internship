import type { Request } from 'express';
import type { Prisma, EntityType } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

/**
 * Centralised audit-log writer. Use this for every meaningful state change
 * (auth events, CRUD on employees/teams, role changes, …).
 *
 * Design notes:
 *  • Writes are best-effort: a failure here NEVER bubbles up to fail the
 *    user request. We log the failure to Winston so we still see it.
 *  • `organisationId` and `userId` are nullable for pre-auth events such as
 *    failed logins (we still want a row for forensics).
 *  • `metadata` is jsonb — use it for the diff/payload of the action.
 */
export interface LogAuditInput {
  organisationId?: string | null;
  userId?: string | null;
  action: string; // e.g. "LOGIN_SUCCESS", "EMPLOYEE_CREATED"
  entityType: EntityType;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  req?: Request;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organisationId: input.organisationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: input.req?.ip ?? null,
        userAgent: input.req?.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log', {
      err,
      action: input.action,
      entityType: input.entityType,
    });
  }
}
