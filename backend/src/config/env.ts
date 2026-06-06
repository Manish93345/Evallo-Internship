import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Validate environment variables at startup so we fail fast with a clear
 * error message instead of crashing later with a cryptic `undefined`.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    '\n❌ Invalid environment variables:\n',
    parsed.error.flatten().fieldErrors,
    '\nCheck your .env file against .env.example.\n',
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
