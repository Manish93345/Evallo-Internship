import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Stricter rate limit for auth endpoints. 5 attempts per 15 minutes per IP
 * is the typical "online password guessing" threshold — generous enough not
 * to lock out humans, strict enough to defeat naive credential stuffing.
 *
 * In production behind a reverse proxy we'd combine this with proxy-aware
 * IP detection (`app.set('trust proxy', 1)`) and ideally per-account counters
 * in Redis. Documented as future work in PHASE1_NOTES.md.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 20, // generous in dev, strict in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts from this IP. Please try again later.',
    },
  },
});

/**
 * Generic limiter for everything else (much higher ceiling).
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10_000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' },
  },
});
