import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  employeesApi,
  type CreateEmployeePayload,
  type ListEmployeesParams,
  type UpdateEmployeePayload,
} from '../lib/employeesApi';

/**
 * Encapsulated TanStack Query hooks for the Employees feature.
 *
 *   • `useEmployeesList` — paginated + searchable, keepPreviousData for
 *     a smooth pagination experience (no flicker between pages).
 *   • `useCreate/Update/Delete` — automatically invalidate the list and any
 *     individual records they touch, so cache stays consistent without
 *     callers having to remember the keys.
 *
 * Centralising the cache keys here (the `employeesKeys` factory) is the
 * single most useful refactor in a Query-heavy codebase.
 */

export const employeesKeys = {
  all: ['employees'] as const,
  lists: () => [...employeesKeys.all, 'list'] as const,
  list: (params: ListEmployeesParams) => [...employeesKeys.lists(), params] as const,
  details: () => [...employeesKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeesKeys.details(), id] as const,
};

export function useEmployeesList(params: ListEmployeesParams) {
  return useQuery({
    queryKey: employeesKeys.list(params),
    queryFn: () => employeesApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: id ? employeesKeys.detail(id) : ['employees', 'detail', 'noop'],
    queryFn: () => employeesApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => employeesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
      // Teams' memberCount may have changed too.
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEmployeePayload) => employeesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
      qc.invalidateQueries({ queryKey: employeesKeys.detail(id) });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
