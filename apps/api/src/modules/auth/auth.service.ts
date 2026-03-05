import { prisma } from '../../database/prisma.client';
import { redis, CACHE_KEYS, CACHE_TTL, cacheGet, cacheSet, cacheIncr, cacheDel } from '../../cache/redis.client';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  serverEncrypt,
  serverDecrypt,
} from '../../crypto/crypto.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../common/middleware/auth.middleware';
import { AppError } from '../../common/errors/app.error';
import { logger } from '../../config/logger';
import { UserStatus } from '@prisma/client';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

// ─── Auth Service ────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Registers a new user and creates their default organization.
   * Password is hashed with Argon2id before storage.
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
  }) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw AppError.conflict('Email already registered', 'EMAIL_EXISTS');
    }

    // Hash password with Argon2id - NEVER store plaintext
    const hashedPassword = await hashPassword(data.password);

    // Generate org slug from name
    const slug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const uniqueSlug = `${slug}-${crypto.randomBytes(4).toString('hex')}`;

    // Create user + organization + membership in a transaction
    const { user, organization } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          hashedPassword, // Argon2id hash only
          name: data.name,
          status: UserStatus.ACTIVE, // Skip email verification for demo
        },
        select: { id: true, email: true, name: true, status: true },
      });

      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug: uniqueSlug,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
              joinedAt: new Date(),
            },
          },
          subscription: {
            create: {
              planType: 'SOLO',
              status: 'TRIALING',
              maxSecrets: 50,
              maxProjects: 3,
              maxMembers: 1,
              maxApiKeys: 2,
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            },
          },
        },
        select: { id: true, name: true, slug: true },
      });

      return { user, organization };
    });

    logger.info('New user registered', { userId: user.id, orgId: organization.id });

    // Generate tokens
    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);

    // Store refresh token hash
    await this.storeRefreshToken(user.id, refreshToken, 'registration');

    return { user, organization, accessToken, refreshToken };
  }

  /**
   * Authenticates a user with email/password.
   * Enforces brute force protection with Redis-backed attempt counting.
   */
  async login(data: {
    email: string;
    password: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const email = data.email.toLowerCase();

    // Check account lockout
    const lockKey = CACHE_KEYS.LOGIN_ATTEMPTS(email);
    const attempts = await cacheGet<number>(lockKey);
    
    if (attempts && attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        `Account locked due to too many failed attempts. Try again in ${LOCK_DURATION_MINUTES} minutes.`,
        423,
        'ACCOUNT_LOCKED',
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        status: true,
        twoFactorEnabled: true,
        lockedUntil: true,
      },
    });

    // Use constant-time comparison even for "user not found" to prevent enumeration
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$placeholder';
    const passwordValid = user
      ? await verifyPassword(user.hashedPassword, data.password)
      : await verifyPassword(dummyHash, data.password).catch(() => false);

    if (!user || !passwordValid) {
      // Increment attempt counter
      await cacheIncr(lockKey, LOCK_DURATION_MINUTES * 60);
      
      // Log failed attempt (without password)
      logger.warn('Failed login attempt', {
        email, // OK to log email
        ip: data.ipAddress,
        attemptCount: (attempts ?? 0) + 1,
      });

      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('Account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Account is temporarily locked.', 423, 'ACCOUNT_LOCKED');
    }

    // Clear failed attempts on successful auth
    await cacheDel(lockKey);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: data.ipAddress,
        loginAttempts: 0,
      },
    });

    // If 2FA is enabled, return partial session requiring TOTP
    if (user.twoFactorEnabled) {
      const challengeToken = generateSecureToken(16);
      await cacheSet(
        CACHE_KEYS.TWO_FACTOR_CHALLENGE(user.id),
        { userId: user.id, challengeToken },
        300 // 5 minutes to complete 2FA
      );

      return {
        requiresTwoFactor: true,
        userId: user.id,
        challengeToken, // Client uses this to complete 2FA
      };
    }

    // Full login — generate tokens
    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);
    await this.storeRefreshToken(user.id, refreshToken, data.deviceInfo, data.ipAddress);

    return {
      requiresTwoFactor: false,
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Completes 2FA login flow by verifying TOTP code.
   */
  async verifyTwoFactor(data: {
    userId: string;
    challengeToken: string;
    totpCode: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const challengeKey = CACHE_KEYS.TWO_FACTOR_CHALLENGE(data.userId);
    const challenge = await cacheGet<{ userId: string; challengeToken: string }>(challengeKey);

    if (!challenge || challenge.challengeToken !== data.challengeToken) {
      throw AppError.unauthorized('Invalid or expired 2FA challenge', 'INVALID_2FA_CHALLENGE');
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        email: true,
        name: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.twoFactorSecret) {
      throw AppError.unauthorized('2FA not configured', '2FA_NOT_SETUP');
    }

    // Decrypt the TOTP secret (stored server-side encrypted)
    const [encrypted, iv, authTag] = user.twoFactorSecret.split(':');
    const totpSecret = serverDecrypt(encrypted, iv, authTag);

    const isValid = authenticator.verify({
      token: data.totpCode,
      secret: totpSecret,
    });

    if (!isValid) {
      throw AppError.unauthorized('Invalid 2FA code', 'INVALID_TOTP');
    }

    // Clear challenge
    await cacheDel(challengeKey);

    // Issue tokens
    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);
    await this.storeRefreshToken(user.id, refreshToken, data.deviceInfo, data.ipAddress);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refreshes access token using a valid refresh token.
   */
  async refreshToken(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const tokenHash = hashToken(token);

    // Check if token is in the DB and not revoked
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token revoked or expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Rotate refresh token (security: each token can only be used once)
    const newAccessToken = signAccessToken(payload.sub, payload.email);
    const newRefreshToken = signRefreshToken(payload.sub, payload.email);

    await prisma.$transaction(async (tx) => {
      // Revoke old token
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      // Store new refresh token
      const newHash = hashToken(newRefreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: newHash,
          expiresAt,
        },
      });
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revokes a refresh token (logout).
   */
  async logout(refreshToken: string, userId: string) {
    const tokenHash = hashToken(refreshToken);
    
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Sets up 2FA for a user — returns QR code URL.
   * The actual TOTP secret is stored server-side encrypted.
   */
  async setupTwoFactor(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) throw AppError.notFound('User not found');
    if (user.twoFactorEnabled) {
      throw AppError.conflict('2FA is already enabled', '2FA_ALREADY_ENABLED');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'DevVault', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    // Store encrypted secret temporarily (user must verify before enabling)
    const { encrypted, iv, authTag } = serverEncrypt(secret);
    const encryptedSecret = `${encrypted}:${iv}:${authTag}`;

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret }, // Stored encrypted, not enabled yet
    });

    return { qrCodeUrl, secret }; // Return both for manual entry
  }

  /**
   * Confirms and enables 2FA after user verifies the TOTP code.
   */
  async enableTwoFactor(userId: string, totpCode: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) throw AppError.badRequest('2FA not set up. Call setup first.');
    if (user.twoFactorEnabled) throw AppError.conflict('2FA already enabled', '2FA_ENABLED');

    const [encrypted, iv, authTag] = user.twoFactorSecret.split(':');
    const secret = serverDecrypt(encrypted, iv, authTag);

    const isValid = authenticator.verify({ token: totpCode, secret });
    if (!isValid) throw AppError.unauthorized('Invalid TOTP code', 'INVALID_TOTP');

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    const hashedBackupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    return { backupCodes }; // Return plaintext ONE TIME, never stored
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async storeRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { userId, tokenHash, deviceInfo, ipAddress, expiresAt },
    });
  }
}

export const authService = new AuthService();
