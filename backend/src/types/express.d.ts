/**
 * Ambient type augmentation for Express's Request.
 *
 * Once requireAuth has run, downstream handlers can read `req.auth.userId`
 * and `req.auth.organisationId` with full type safety. `requestId` is set by
 * requestLogger middleware on every inbound request.
 */
import 'express';
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: {
        userId: string;
        organisationId: string;
        role: Role;
        email: string;
      };
    }
  }
}

export {};
