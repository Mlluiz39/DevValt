import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  organizationName: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const twoFactorVerifySchema = z.object({
  userId: z.string().uuid(),
  challengeToken: z.string().min(1),
  totpCode: z.string().length(6).regex(/^\d{6}$/),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const enableTwoFactorSchema = z.object({
  totpCode: z.string().length(6).regex(/^\d{6}$/),
});

// ─── Controller ──────────────────────────────────────────────────────────────

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          organization: result.organization,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login({
        ...data,
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async verifyTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      const data = twoFactorVerifySchema.parse(req.body);
      const result = await authService.verifyTwoFactor({
        ...data,
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await authService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken && req.user) {
        await authService.logout(refreshToken, req.user.id);
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async setupTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.setupTwoFactor(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async enableTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      const { totpCode } = enableTwoFactorSchema.parse(req.body);
      const result = await authService.enableTwoFactor(req.user!.id, totpCode);
      res.json({
        success: true,
        message: '2FA enabled successfully. Save your backup codes!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await import('../../database/prisma.client').then(m =>
        m.prisma.user.findUnique({
          where: { id: req.user!.id },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            status: true,
            twoFactorEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            memberships: {
              select: {
                role: true,
                organization: {
                  select: { id: true, name: true, slug: true, planType: true },
                },
              },
            },
          },
        })
      );

      if (!user) {
        res.status(404).json({ success: false, error: { message: 'User not found' } });
        return;
      }

      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
