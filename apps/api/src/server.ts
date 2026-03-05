import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import { prisma } from './database/prisma.client';
import { redis } from './cache/redis.client';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function bootstrap(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 DevVault API running on port ${PORT}`);
      logger.info(`📋 Environment: ${process.env.NODE_ENV ?? 'development'}`);
      logger.info(`🔒 Zero-Knowledge encryption: enabled`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        await prisma.$disconnect();
        redis.disconnect();
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
