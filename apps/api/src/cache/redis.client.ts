import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) return null; // Stop retrying after 5 attempts
    return Math.min(times * 200, 2000); // Exponential backoff
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => logger.info('📡 Redis connecting...'));
redis.on('ready', () => logger.info('✅ Redis ready'));
redis.on('error', (err) => logger.error('❌ Redis error:', { message: err.message }));
redis.on('close', () => logger.warn('⚠️  Redis connection closed'));
redis.on('reconnecting', () => logger.info('🔄 Redis reconnecting...'));

// ─── Cache utilities ─────────────────────────────────────────────────────────

export const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 3600,         // 1 hour
  DAY: 86400,         // 24 hours
  WEEK: 604800,       // 7 days
} as const;

export const CACHE_KEYS = {
  // Rate limiting
  RATE_LIMIT: (ip: string) => `rl:${ip}`,
  LOGIN_ATTEMPTS: (email: string) => `login_attempts:${email}`,
  
  // User sessions
  USER_SESSION: (userId: string) => `session:${userId}`,
  REFRESH_TOKEN_BLACKLIST: (tokenHash: string) => `revoked:${tokenHash}`,
  
  // Organization & Plan
  ORG_PLAN: (orgId: string) => `plan:${orgId}`,
  ORG_LIMITS: (orgId: string) => `limits:${orgId}`,
  
  // API Key validation cache
  API_KEY: (keyHash: string) => `apikey:${keyHash}`,
  
  // 2FA
  TWO_FACTOR_CHALLENGE: (userId: string) => `2fa_challenge:${userId}`,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheExists(key: string): Promise<boolean> {
  const result = await redis.exists(key);
  return result === 1;
}

export async function cacheIncr(key: string, ttl?: number): Promise<number> {
  const count = await redis.incr(key);
  if (ttl && count === 1) {
    await redis.expire(key, ttl);
  }
  return count;
}
