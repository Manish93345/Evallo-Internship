/**
 * Shared response types for the HRMS API. Kept in one place so every
 * page / hook references the same shape — and so any drift between
 * backend and frontend shows up as a TypeScript error.
 *
 * These mirror the JSON envelopes returned by:
 *   GET  /api/v1/employees        → Paginated<Employee>
 *   GET  /api/v1/teams            → Paginated<TeamWithCount>
 *   GET  /api/v1/teams/:id        → TeamDetail (includes members)
 *   GET  /api/v1/audit-logs       → Paginated<AuditLog>
 */

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

// ---------- Employees ----------

export interface TeamRef {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  joinedAt: string | null; // ISO date string
  createdAt: string;
  updatedAt: string;
  teams: TeamRef[];
}

// ---------- Teams ----------

export interface Team {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
}

export interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

// ---------- Audit logs ----------

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'CREATE_EMPLOYEE'
  | 'UPDATE_EMPLOYEE'
  | 'DELETE_EMPLOYEE'
  | 'CREATE_TEAM'
  | 'UPDATE_TEAM'
  | 'DELETE_TEAM'
  | 'ASSIGN_TEAM_MEMBERS'
  | 'REMOVE_TEAM_MEMBER'
  | (string & {});

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}
