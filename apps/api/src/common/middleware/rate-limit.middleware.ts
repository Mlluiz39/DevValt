import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { redis } from "../../cache/redis.client";
import { env } from "../../config/env";
import { Request, Response } from "express";

const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS);
const max = parseInt(env.RATE_LIMIT_MAX);

// Wrapper para o sendCommand que converte array em argumentos
const createSendCommand = (prefix: string) => {
  return async (...args: string[]): Promise<RedisReply> => {
    return (redis as any).call(...args) as Promise<RedisReply>;
  };
};

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
export const globalRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: createSendCommand("rl_global:"),
    prefix: "rl_global:",
  }),
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
    retryAfter: Math.ceil(windowMs / 1000),
  },
  keyGenerator: (req: Request) => req.ip ?? "unknown",
});

// ─── Auth Rate Limiter (strict) ───────────────────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "production" ? 10 : 10000, // Max 10 login attempts per 15 min in prod, much more in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: createSendCommand("rl_auth:"),
    prefix: "rl_auth:",
  }),
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again in 15 minutes.",
    retryAfter: 900,
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error:
        "Too many authentication attempts. Account temporarily restricted.",
      retryAfter: 900,
    });
  },
});

// ─── API Key Rate Limiter ────────────────────────────────────────────────────
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 req/min per API key
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: createSendCommand("rl_apikey:"),
    prefix: "rl_apikey:",
  }),
  keyGenerator: (req: Request) =>
    (req.headers["x-api-key"] as string) ?? req.ip ?? "unknown",
  message: {
    success: false,
    error: "API rate limit exceeded. Slow down your requests.",
  },
});
