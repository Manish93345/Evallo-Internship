import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes';

export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy (Render/Railway/Vercel proxy) we need this so
  // `req.ip` reflects the real client IP — important for rate-limiting and
  // audit logging.
  app.set('trust proxy', 1);

  // Security & infra middleware
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // API routes (versioned)
  app.use('/api/v1', apiRoutes);

  // Root → friendly message so visitors don't get a 404 by mistake
  app.get('/', (_req, res) => {
    res.json({
      name: 'HRMS API',
      version: '0.2.0',
      docs: '/api/v1/health',
    });
  });

  // 404 & error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
