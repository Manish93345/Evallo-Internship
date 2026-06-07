import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';
import authRoutes from '../modules/auth/auth.routes';
import employeeRoutes from '../modules/employees/employees.routes';
import teamRoutes from '../modules/teams/teams.routes';
import auditLogRoutes from '../modules/auditLogs/auditLogs.routes';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Generic rate limiter applied across the whole API surface.
router.use(apiRateLimiter);

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Phase 2 — core CRUD + audit
router.use('/employees', employeeRoutes);
router.use('/teams', teamRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
