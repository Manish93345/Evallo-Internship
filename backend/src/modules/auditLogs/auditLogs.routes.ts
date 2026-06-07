import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as auditLogs from './auditLogs.controller';

/**
 * Audit log surface — mounted at /api/v1/audit-logs.
 *
 *   GET / — paginated, filterable. OWNER only (per PROJECT_PLAN §4).
 *
 * We layer `requireRole('OWNER')` AFTER `requireAuth` so the response is a
 * proper 403 (Forbidden) instead of a 404, since the resource itself exists.
 */
const router = Router();

router.use(requireAuth, requireRole('OWNER'));

router.get('/', auditLogs.list);

export default router;
