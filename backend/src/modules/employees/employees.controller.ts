import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { PaginationQuerySchema } from '../../lib/pagination';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  EmployeeIdParamSchema,
} from './employees.schema';
import * as employeesService from './employees.service';

/**
 * HTTP adapters for the Employees module. Each handler:
 *   1. Asserts req.auth is present (requireAuth middleware guarantees this,
 *      but the type narrowing also makes the rest of the function safer).
 *   2. Validates input with Zod.
 *   3. Calls the service layer with the caller's organisationId.
 *   4. Shapes the JSON response.
 */

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const query = PaginationQuerySchema.parse(req.query);
  const result = await employeesService.listEmployees(req.auth.organisationId, query);
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = EmployeeIdParamSchema.parse(req.params);
  const employee = await employeesService.getEmployee(req.auth.organisationId, id);
  res.status(200).json(employee);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = CreateEmployeeSchema.parse(req.body);
  const employee = await employeesService.createEmployee(
    req.auth.organisationId,
    req.auth.userId,
    input,
    req,
  );
  res.status(201).json(employee);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = EmployeeIdParamSchema.parse(req.params);
  const input = UpdateEmployeeSchema.parse(req.body);
  const employee = await employeesService.updateEmployee(
    req.auth.organisationId,
    req.auth.userId,
    id,
    input,
    req,
  );
  res.status(200).json(employee);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = EmployeeIdParamSchema.parse(req.params);
  await employeesService.deleteEmployee(req.auth.organisationId, req.auth.userId, id, req);
  res.status(204).send();
});
