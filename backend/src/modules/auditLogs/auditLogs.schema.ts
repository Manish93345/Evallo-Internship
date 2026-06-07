import { z } from 'zod';
import { EntityType } from '@prisma/client';

/**
 * Filter shape for `GET /audit-logs`.
 *
 *   ?page&limit       — standard pagination
 *   ?action=          — exact match on the action string (e.g. LOGIN_SUCCESS)
 *   ?entityType=      — narrow to a particular entity (EMPLOYEE, TEAM, …)
 *   ?from&to          — ISO date-times defining a closed range over created_at
 *   ?userId=          — only events triggered by a specific user
 */
export const AuditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    action: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    entityType: z.nativeEnum(EntityType).optional(),
    userId: z.string().uuid().optional(),
    from: z
      .string()
      .datetime({ offset: true })
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    to: z
      .string()
      .datetime({ offset: true })
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
  })
  .refine(
    (obj) => !(obj.from && obj.to) || obj.from <= obj.to,
    { message: '`from` must be earlier than or equal to `to`', path: ['from'] },
  );
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
