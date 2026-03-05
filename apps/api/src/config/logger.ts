import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

// Production format - structured JSON (never log sensitive data)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'devvault-api' },
  format: env.NODE_ENV === 'production'
    ? prodFormat
    : combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        devFormat,
      ),
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  // CRITICAL: Never log sensitive data
  // Add a sanitizer if needed
});

// Prevent logging of sensitive fields
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'encryptedValue', 'iv', 'authTag', 'salt'];

export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(data).reduce((acc, [k, v]) => {
    const isSensitive = SENSITIVE_FIELDS.some(field => k.toLowerCase().includes(field.toLowerCase()));
    acc[k] = isSensitive ? '[REDACTED]' : v;
    return acc;
  }, {} as Record<string, unknown>);
}
