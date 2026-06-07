import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { AuditLogQuerySchema } from './auditLogs.schema';
import * as auditLogsService from './auditLogs.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const query = AuditLogQuerySchema.parse(req.query);
  const result = await auditLogsService.listAuditLogs(req.auth.organisationId, query);
  res.status(200).json(result);
});
