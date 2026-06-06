import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

/**
 * Single Prisma instance reused across the app.
 * In dev with ts-node-dev's hot reload, we cache it on `globalThis` to avoid
 * exhausting Neon's connection pool on every restart.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [{ level: 'warn', emit: 'event' }, { level: 'error', emit: 'event' }]
        : [{ level: 'error', emit: 'event' }],
  });

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Forward Prisma's internal log events into our Winston logger
prisma.$on('warn' as never, (e: unknown) => logger.warn({ prisma: e }));
prisma.$on('error' as never, (e: unknown) => logger.error({ prisma: e }));

export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error('Database ping failed', { err });
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
