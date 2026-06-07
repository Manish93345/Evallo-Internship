import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, type ListAuditLogsParams } from '../lib/auditLogsApi';

/**
 * React Query hook for the audit logs list. Mirrors the pattern used by
 * `useEmployees` / `useTeams` — centralised cache key factory, smooth
 * pagination via `placeholderData`.
 *
 * Owner-only on the backend; the consumer (`AuditLogsPage`) decides
 * whether to fire the query based on the current user's role.
 */
export const auditLogsKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogsKeys.all, 'list'] as const,
  list: (params: ListAuditLogsParams) => [...auditLogsKeys.lists(), params] as const,
};

export function useAuditLogsList(params: ListAuditLogsParams, enabled = true) {
  return useQuery({
    queryKey: auditLogsKeys.list(params),
    queryFn: () => auditLogsApi.list(params),
    enabled,
    placeholderData: (prev) => prev,
    retry: false, // 403 / 401 shouldn't be retried
  });
}
