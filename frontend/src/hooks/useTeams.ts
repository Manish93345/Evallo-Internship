import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  teamsApi,
  type CreateTeamPayload,
  type ListTeamsParams,
  type UpdateTeamPayload,
} from '../lib/teamsApi';

export const teamsKeys = {
  all: ['teams'] as const,
  lists: () => [...teamsKeys.all, 'list'] as const,
  list: (params: ListTeamsParams) => [...teamsKeys.lists(), params] as const,
  details: () => [...teamsKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamsKeys.details(), id] as const,
};

export function useTeamsList(params: ListTeamsParams) {
  return useQuery({
    queryKey: teamsKeys.list(params),
    queryFn: () => teamsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: id ? teamsKeys.detail(id) : ['teams', 'detail', 'noop'],
    queryFn: () => teamsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeamPayload) => teamsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamsKeys.lists() });
    },
  });
}

export function useUpdateTeam(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTeamPayload) => teamsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamsKeys.lists() });
      qc.invalidateQueries({ queryKey: teamsKeys.detail(id) });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamsKeys.lists() });
      // Employees' team badges might change.
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useAssignMembers(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeIds: string[]) => teamsApi.assignMembers(teamId, employeeIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamsKeys.lists() });
      qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useRemoveMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => teamsApi.removeMember(teamId, employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamsKeys.lists() });
      qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
