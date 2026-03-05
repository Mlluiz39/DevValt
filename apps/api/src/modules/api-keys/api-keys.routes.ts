import { Router } from 'express';
import { authenticate, requireActiveUser, requireOrgMember } from '../../common/middleware/auth.middleware';
import { checkPlanLimit } from '../../common/middleware/plan-limit.middleware';
import { prisma } from '../../database/prisma.client';
import { generateApiKey, hashApiKey } from '../../crypto/crypto.service';
import { AppError } from '../../common/errors/app.error';
import { MemberRole } from '@prisma/client';
import { z } from 'zod';
import { auditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

export const apiKeysRouter = Router({ mergeParams: true });

apiKeysRouter.use(authenticate, requireActiveUser);

// Create API key
apiKeysRouter.post(
  '/',
  requireOrgMember(MemberRole.ADMIN),
  checkPlanLimit('apiKeys'),
  async (req, res, next) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).default(['secrets:read']),
        expiresAt: z.coerce.date().optional(),
      });

      const dto = schema.parse(req.body);
      const { key, keyHash, keyPrefix } = generateApiKey();

      const apiKey = await prisma.apiKey.create({
        data: {
          organizationId: req.params.orgId,
          userId: req.user!.id,
          name: dto.name,
          keyHash,
          keyPrefix,
          scopes: dto.scopes,
          expiresAt: dto.expiresAt,
        },
        select: { id: true, name: true, keyPrefix: true, scopes: true, expiresAt: true, createdAt: true },
      });

      await auditService.log({
        organizationId: req.params.orgId,
        userId: req.user!.id,
        action: AuditAction.API_KEY_CREATED,
        ipAddress: req.ip,
        metadata: { keyName: dto.name, keyPrefix },
      });

      res.status(201).json({
        success: true,
        data: {
          ...apiKey,
          key, // ⚠️ SHOWN ONLY ONCE — client must save this
          _warning: 'Save this key now! It will never be shown again.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// List API keys (no secrets returned)
apiKeysRouter.get('/', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.params.orgId, status: 'ACTIVE' },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        lastUsedAt: true, usageCount: true, expiresAt: true, createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
});

// Rotate API key
apiKeysRouter.post('/:keyId/rotate', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id: req.params.keyId, organizationId: req.params.orgId },
    });

    if (!existing) throw AppError.notFound('API key not found');

    const { key, keyHash, keyPrefix } = generateApiKey();

    await prisma.$transaction([
      // Revoke old key
      prisma.apiKey.update({
        where: { id: existing.id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      }),
      // Create new rotated key
      prisma.apiKey.create({
        data: {
          organizationId: existing.organizationId,
          userId: req.user!.id,
          name: existing.name,
          keyHash,
          keyPrefix,
          scopes: existing.scopes,
          expiresAt: existing.expiresAt,
        },
      }),
    ]);

    await auditService.log({
      organizationId: req.params.orgId,
      userId: req.user!.id,
      action: AuditAction.API_KEY_ROTATED,
      ipAddress: req.ip,
      metadata: { oldKeyPrefix: existing.keyPrefix, newKeyPrefix: keyPrefix },
    });

    res.json({
      success: true,
      data: { key, keyPrefix },
      _warning: 'Save this key now! It will never be shown again.',
    });
  } catch (error) {
    next(error);
  }
});

// Revoke API key
apiKeysRouter.delete('/:keyId', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id: req.params.keyId, organizationId: req.params.orgId },
    });

    if (!existing) throw AppError.notFound('API key not found');

    await prisma.apiKey.update({
      where: { id: existing.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await auditService.log({
      organizationId: req.params.orgId,
      userId: req.user!.id,
      action: AuditAction.API_KEY_DELETED,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    next(error);
  }
});
