import { api } from './api';
import type { Paginated, Team, TeamDetail } from './types';

/**
 * Typed wrappers around /api/v1/teams endpoints.
 */

export interface ListTeamsParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export type UpdateTeamPayload = Partial<CreateTeamPayload>;

export const teamsApi = {
  list(params: ListTeamsParams = {}): Promise<Paginated<Team>> {
    return api.get<Paginated<Team>>('/teams', { params }).then((r) => r.data);
  },

  get(id: string): Promise<TeamDetail> {
    return api.get<TeamDetail>(`/teams/${id}`).then((r) => r.data);
  },

  create(payload: CreateTeamPayload): Promise<Team> {
    return api.post<Team>('/teams', payload).then((r) => r.data);
  },

  update(id: string, payload: UpdateTeamPayload): Promise<Team> {
    return api.patch<Team>(`/teams/${id}`, payload).then((r) => r.data);
  },

  remove(id: string): Promise<void> {
    return api.delete(`/teams/${id}`).then(() => undefined);
  },

  /** Bulk add employees to a team (idempotent). */
  assignMembers(id: string, employeeIds: string[]): Promise<TeamDetail> {
    return api
      .post<TeamDetail>(`/teams/${id}/members`, { employeeIds })
      .then((r) => r.data);
  },

  /** Remove a single employee from a team. */
  removeMember(id: string, employeeId: string): Promise<void> {
    return api.delete(`/teams/${id}/members/${employeeId}`).then(() => undefined);
  },
};
