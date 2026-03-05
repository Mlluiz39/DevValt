import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
}

// Singleton pattern to avoid connection pool exhaustion in development (HMR)
export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Event listeners for logging (NEVER log query params - may contain sensitive data)
prisma.$on('error', (e) => {
  logger.error('Prisma error:', { message: e.message, target: e.target });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', { message: e.message, target: e.target });
});

// Only log queries in development and WITHOUT parameters (security)
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query [${e.duration}ms]: ${e.query.substring(0, 100)}...`);
  });
}
