import { api } from './api';
import type { AuditLog, Paginated } from './types';

/**
 * Typed wrapper around /api/v1/audit-logs.
 *
 * The backend supports filtering by `action`, `entityType`, `userId`, and a
 * `from`/`to` ISO date range. The frontend doesn't expose `userId` (we'd
 * need a user picker) — that's intentional, the rest covers 95% of
 * "what happened on Monday?" investigations.
 */

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  from?: string; // ISO 8601 with offset
  to?: string;   // ISO 8601 with offset
}

export const auditLogsApi = {
  list(params: ListAuditLogsParams = {}): Promise<Paginated<AuditLog>> {
    // Strip empty strings — the backend Zod schema treats them as invalid.
    const cleaned = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ),
    );
    return api.get<Paginated<AuditLog>>('/audit-logs', { params: cleaned }).then((r) => r.data);
  },
};
