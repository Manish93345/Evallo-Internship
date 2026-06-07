import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import * as employees from './employees.controller';

/**
 * Employees surface — mounted at /api/v1/employees.
 *
 *   GET    /              — paginated + searchable list (?page&limit&q)
 *   POST   /              — create (optionally with teamIds)
 *   GET    /:id           — single employee + assigned teams
 *   PATCH  /:id           — partial update
 *   DELETE /:id           — delete (cascades team_members)
 *
 * Every route is gated by `requireAuth` so `req.auth.organisationId` is
 * guaranteed downstream.
 */
const router = Router();

router.use(requireAuth);

router.get('/', employees.list);
router.post('/', employees.create);
router.get('/:id', employees.getOne);
router.patch('/:id', employees.update);
router.delete('/:id', employees.remove);

export default router;
