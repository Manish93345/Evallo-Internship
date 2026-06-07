import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import * as teams from './teams.controller';

/**
 * Teams surface — mounted at /api/v1/teams.
 *
 *   GET    /                          — paginated list (+ memberCount)
 *   POST   /                          — create
 *   GET    /:id                       — single team + members
 *   PATCH  /:id                       — partial update
 *   DELETE /:id                       — delete (cascades team_members)
 *
 *   POST   /:id/members               — bulk assign employees (transaction)
 *   DELETE /:id/members/:employeeId   — unassign a single employee
 */
const router = Router();

router.use(requireAuth);

router.get('/', teams.list);
router.post('/', teams.create);
router.get('/:id', teams.getOne);
router.patch('/:id', teams.update);
router.delete('/:id', teams.remove);

router.post('/:id/members', teams.assignMembers);
router.delete('/:id/members/:employeeId', teams.removeMember);

export default router;
