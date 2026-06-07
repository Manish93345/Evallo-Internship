import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
} from './auth.schema';
import * as authService from './auth.service';

/**
 * HTTP-layer adapters. Each controller validates input with Zod, delegates
 * the business logic to the service layer, and shapes the HTTP response.
 *
 * We deliberately do NOT catch errors here — they fall through to the global
 * error handler which knows how to map ZodError, Prisma errors, and ApiError
 * into clean JSON responses.
 */

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = RegisterSchema.parse(req.body);
  const session = await authService.registerOrganisation(input, req);
  res.status(201).json(session);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = LoginSchema.parse(req.body);
  const session = await authService.login(input, req);
  res.status(200).json(session);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = RefreshSchema.parse(req.body);
  const tokens = await authService.refresh(refreshToken, req);
  res.status(200).json(tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const parsed = LogoutSchema.safeParse(req.body ?? {});
  const refreshToken = parsed.success ? parsed.data.refreshToken : undefined;
  await authService.logout({
    userId: req.auth.userId,
    organisationId: req.auth.organisationId,
    refreshToken,
    req,
  });
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const data = await authService.getMe(req.auth.userId);
  res.status(200).json(data);
});
