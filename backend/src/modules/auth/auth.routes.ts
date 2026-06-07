import { Router } from 'express';
import { authRateLimiter } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/requireAuth';
import * as auth from './auth.controller';

/**
 * Auth surface — versioned at /api/v1/auth.
 *
 *   POST /register   — create organisation + first OWNER user
 *   POST /login      — issue access + refresh tokens
 *   POST /refresh    — rotate the refresh token
 *   POST /logout     — revoke session(s)        [requires auth]
 *   GET  /me         — current user + org       [requires auth]
 */
const router = Router();

// Public endpoints get the strict auth rate limiter.
router.post('/register', authRateLimiter, auth.register);
router.post('/login', authRateLimiter, auth.login);
router.post('/refresh', authRateLimiter, auth.refresh);

// Protected endpoints
router.post('/logout', requireAuth, auth.logout);
router.get('/me', requireAuth, auth.me);

export default router;
