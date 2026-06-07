import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';
import authRoutes from '../modules/auth/auth.routes';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Generic rate limiter applied across the whole API surface.
router.use(apiRateLimiter);

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Future routes (Phase 2+):
// router.use('/employees', employeeRoutes);
// router.use('/teams', teamRoutes);
// router.use('/audit-logs', auditRoutes);

export default router;
