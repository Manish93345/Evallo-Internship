import { api } from './api';
import type { Employee, Paginated } from './types';

/**
 * Typed wrappers around /api/v1/employees endpoints.
 * Pure functions — no React, no caching. Hooks in `hooks/useEmployees.ts`
 * layer TanStack Query on top.
 */

export interface ListEmployeesParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  joinedAt?: string;
  teamIds?: string[];
}

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

export const employeesApi = {
  list(params: ListEmployeesParams = {}): Promise<Paginated<Employee>> {
    return api.get<Paginated<Employee>>('/employees', { params }).then((r) => r.data);
  },

  get(id: string): Promise<Employee> {
    return api.get<Employee>(`/employees/${id}`).then((r) => r.data);
  },

  create(payload: CreateEmployeePayload): Promise<Employee> {
    return api.post<Employee>('/employees', payload).then((r) => r.data);
  },

  update(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    return api.patch<Employee>(`/employees/${id}`, payload).then((r) => r.data);
  },

  remove(id: string): Promise<void> {
    return api.delete(`/employees/${id}`).then(() => undefined);
  },
};
