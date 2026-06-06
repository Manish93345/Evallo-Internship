import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger';

/**
 * Lightweight request logger: attaches a requestId, logs method/path/status/duration.
 * We deliberately avoid morgan's combined format so we can emit structured JSON.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
    });
  });

  next();
}
