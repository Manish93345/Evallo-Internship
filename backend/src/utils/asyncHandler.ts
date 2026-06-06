import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers so thrown errors flow into Express's
 * error-handling middleware instead of becoming unhandled rejections.
 */
export const asyncHandler =
  <Req extends Request = Request>(
    fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
