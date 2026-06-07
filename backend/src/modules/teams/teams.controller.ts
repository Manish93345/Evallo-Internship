import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { PaginationQuerySchema } from '../../lib/pagination';
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamIdParamSchema,
  TeamMemberParamsSchema,
  AssignMembersSchema,
} from './teams.schema';
import * as teamsService from './teams.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const query = PaginationQuerySchema.parse(req.query);
  const result = await teamsService.listTeams(req.auth.organisationId, query);
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = TeamIdParamSchema.parse(req.params);
  const team = await teamsService.getTeam(req.auth.organisationId, id);
  res.status(200).json(team);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = CreateTeamSchema.parse(req.body);
  const team = await teamsService.createTeam(
    req.auth.organisationId,
    req.auth.userId,
    input,
    req,
  );
  res.status(201).json(team);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = TeamIdParamSchema.parse(req.params);
  const input = UpdateTeamSchema.parse(req.body);
  const team = await teamsService.updateTeam(
    req.auth.organisationId,
    req.auth.userId,
    id,
    input,
    req,
  );
  res.status(200).json(team);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = TeamIdParamSchema.parse(req.params);
  await teamsService.deleteTeam(req.auth.organisationId, req.auth.userId, id, req);
  res.status(204).send();
});

export const assignMembers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = TeamIdParamSchema.parse(req.params);
  const { employeeIds } = AssignMembersSchema.parse(req.body);
  const result = await teamsService.assignMembers(
    req.auth.organisationId,
    req.auth.userId,
    id,
    employeeIds,
    req,
  );
  res.status(200).json(result);
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id, employeeId } = TeamMemberParamsSchema.parse(req.params);
  await teamsService.removeMember(
    req.auth.organisationId,
    req.auth.userId,
    id,
    employeeId,
    req,
  );
  res.status(204).send();
});
