import { Router } from 'express';
import { authenticate, requireActiveUser } from '../../common/middleware/auth.middleware';
import { prisma } from '../../database/prisma.client';
import { hashPassword, verifyPassword } from '../../crypto/crypto.service';
import { AppError } from '../../common/errors/app.error';
import { z } from 'zod';

export const usersRouter = Router();

usersRouter.use(authenticate, requireActiveUser);

// Update profile
usersRouter.patch('/me', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      avatarUrl: z.string().url().optional().nullable(),
    });

    const dto = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: dto,
      select: { id: true, name: true, email: true, avatarUrl: true, updatedAt: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Change password
usersRouter.post('/me/change-password', async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z
        .string()
        .min(12)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/),
    });

    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { hashedPassword: true },
    });

    if (!user) throw AppError.notFound('User not found');

    const valid = await verifyPassword(user.hashedPassword, currentPassword);
    if (!valid) throw AppError.unauthorized('Current password is incorrect', 'WRONG_PASSWORD');

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { hashedPassword: newHash },
    });

    // Invalidate all refresh tokens (force re-login on all devices)
    await prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again on all devices.',
    });
  } catch (error) {
    next(error);
  }
});

// Delete account
usersRouter.delete('/me', async (req, res, next) => {
  try {
    const { password } = z.object({ password: z.string() }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { hashedPassword: true },
    });

    if (!user) throw AppError.notFound('User not found');

    const valid = await verifyPassword(user.hashedPassword, password);
    if (!valid) throw AppError.unauthorized('Password confirmation failed', 'WRONG_PASSWORD');

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    res.json({ success: true, message: 'Account scheduled for deletion' });
  } catch (error) {
    next(error);
  }
});
