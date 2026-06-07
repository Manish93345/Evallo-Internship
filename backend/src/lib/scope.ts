/**
 * Multi-tenant scoping helper.
 *
 * Every business query (Employee, Team, TeamMember, AuditLog) MUST be filtered
 * by the requesting user's organisationId. We funnel that through a single
 * helper so it's impossible to forget — and so a reviewer reading the service
 * code can immediately see the tenant guard.
 *
 * Returning a fresh object (not mutating `where`) keeps callers pure.
 */
export function scopeToOrg<W extends Record<string, unknown>>(
  where: W | undefined,
  organisationId: string,
): W & { organisationId: string } {
  return { ...(where ?? ({} as W)), organisationId };
}
