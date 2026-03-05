import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../database/prisma.client';
import { AppError } from '../errors/app.error';
import { MemberRole, UserStatus } from '@prisma/client';
import { cacheGet, CACHE_KEYS } from '../../cache/redis.client';
import { hashApiKey } from '../../crypto/crypto.service';
import { logger } from '../../config/logger';

// ─── JWT Payload ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        status: UserStatus;
      };
      currentOrg?: {
        id: string;
        role: MemberRole;
      };
      apiKeyId?: string;
    }
  }
}

// ─── JWT Authentication ──────────────────────────────────────────────────────

/**
 * Middleware: Authenticates requests via JWT Bearer token.
 * Sets req.user on success.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    if (payload.type !== 'access') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      status: UserStatus.ACTIVE, // Validated by DB below in fetchUser middleware
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
}

/**
 * Middleware: Validates that the authenticated user exists and is active.
 * Use after `authenticate`.
 */
export function requireActiveUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    return;
  }

  // Async operation wrapped
  (async () => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, status: true, lockedUntil: true },
    });

    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Account is temporarily locked', 423, 'ACCOUNT_LOCKED');
    }

    req.user = { id: user.id, email: user.email, status: user.status };
    next();
  })().catch(next);
}

// ─── Organization Authorization ──────────────────────────────────────────────

/**
 * Middleware: Validates that the user is a member of the organization.
 * Sets req.currentOrg with the user's role.
 * 
 * @param minRole - Minimum role required (hierarchy: OWNER > ADMIN > MEMBER > VIEWER)
 */
export function requireOrgMember(minRole: MemberRole = MemberRole.VIEWER) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      return;
    }

    const orgId = req.params.orgId;
    if (!orgId) {
      next(new AppError('Organization ID required', 400, 'MISSING_ORG_ID'));
      return;
    }

    (async () => {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: req.user!.id,
          },
        },
        select: { role: true, organizationId: true },
      });

      if (!membership) {
        throw new AppError(
          'You are not a member of this organization',
          403,
          'NOT_ORG_MEMBER',
        );
      }

      if (!hasRequiredRole(membership.role, minRole)) {
        throw new AppError(
          `This action requires ${minRole} role or higher`,
          403,
          'INSUFFICIENT_ROLE',
        );
      }

      req.currentOrg = {
        id: orgId,
        role: membership.role,
      };
      next();
    })().catch(next);
  };
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  [MemberRole.VIEWER]: 0,
  [MemberRole.MEMBER]: 1,
  [MemberRole.ADMIN]: 2,
  [MemberRole.OWNER]: 3,
};

export function hasRequiredRole(userRole: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ─── API Key Authentication ──────────────────────────────────────────────────

/**
 * Middleware: Authenticates CI/CD requests via X-API-Key header.
 * Checks cache first, then DB.
 */
export function authenticateApiKey(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || !apiKey.startsWith('dvk_')) {
    next(new AppError('Missing or invalid API key', 401, 'INVALID_API_KEY'));
    return;
  }

  (async () => {
    const keyHash = hashApiKey(apiKey);

    // Check cache first (reduce DB load)
    const cached = await cacheGet<{ id: string; orgId: string; scopes: string[] }>(
      CACHE_KEYS.API_KEY(keyHash)
    );

    if (cached) {
      req.currentOrg = { id: cached.orgId, role: MemberRole.MEMBER };
      req.apiKeyId = cached.id;
      next();
      return;
    }

    // Fallback to DB
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        organizationId: true,
        status: true,
        scopes: true,
        expiresAt: true,
        userId: true,
      },
    });

    if (!apiKeyRecord || apiKeyRecord.status !== 'ACTIVE') {
      throw new AppError('Invalid or revoked API key', 401, 'INVALID_API_KEY');
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      throw new AppError('API key has expired', 401, 'API_KEY_EXPIRED');
    }

    // Update usage stats (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: req.ip,
        usageCount: { increment: 1 },
      },
    }).catch((err) => logger.error('Failed to update API key usage', err));

    req.currentOrg = { id: apiKeyRecord.organizationId, role: MemberRole.MEMBER };
    req.apiKeyId = apiKeyRecord.id;
    next();
  })().catch(next);
}

// ─── JWT Utilities ───────────────────────────────────────────────────────────

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access' } satisfies JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function signRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'refresh' } satisfies JwtPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
