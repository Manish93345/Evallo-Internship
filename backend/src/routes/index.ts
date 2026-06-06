import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';

const router = Router();

router.use('/health', healthRoutes);

// Future routes (Phase 1+):
// router.use('/auth', authRoutes);
// router.use('/employees', employeeRoutes);
// router.use('/teams', teamRoutes);
// router.use('/audit-logs', auditRoutes);

export default router;
