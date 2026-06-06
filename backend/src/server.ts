import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectDatabase, pingDatabase } from './config/db';

async function main() {
  const app = createApp();

  // Verify DB connectivity at boot — fail fast with a clear message
  const dbOk = await pingDatabase();
  if (!dbOk) {
    logger.error(
      'Could not connect to the database. Check your DATABASE_URL in .env (Neon project may be paused or the URL may be wrong).',
    );
    process.exit(1);
  }
  logger.info('✅ Database connection verified');

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 HRMS backend listening on http://localhost:${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   Health:      http://localhost:${env.PORT}/api/v1/health`);
  });

  // Graceful shutdown — important for Neon to release pooled connections
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Goodbye 👋');
      process.exit(0);
    });
    // Force exit if shutdown hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
