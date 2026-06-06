import { Router } from 'express';
import { pingDatabase } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * GET /api/v1/health
 *
 * Lightweight liveness + readiness check. The frontend hits this on load to
 * verify end-to-end wiring (Phase 0 acceptance criterion).
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const dbOk = await pingDatabase();
    const payload = {
      status: dbOk ? 'ok' : 'degraded',
      service: 'hrms-backend',
      version: '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      db: dbOk ? 'connected' : 'disconnected',
    };
    res.status(dbOk ? 200 : 503).json(payload);
  }),
);

export default router;
