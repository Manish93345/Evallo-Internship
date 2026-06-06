import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, splat, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format:
    env.NODE_ENV === 'production'
      ? combine(timestamp(), errors({ stack: true }), splat(), json())
      : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), splat(), devFormat),
  transports: [new winston.transports.Console()],
});

// In production we'd also add a file transport or ship to a service like
// Datadog/Logtail. Documented as a Phase 4 / future-work item.
