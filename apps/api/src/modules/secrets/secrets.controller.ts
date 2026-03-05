import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { secretsService } from './secrets.service';
import { SecretType } from '@prisma/client';

// ─── Validation ───────────────────────────────────────────────────────────────

// Base64 validator helper
const base64Regex = /^[A-Za-z0-9+/]+=*$/;

const encryptedPayloadSchema = z.object({
  encryptedValue: z.string().min(1).regex(base64Regex, 'Must be base64'),
  iv: z.string().min(16).regex(base64Regex, 'Must be base64'), // 12 bytes base64 = 16 chars
  authTag: z.string().min(22).regex(base64Regex, 'Must be base64'), // 16 bytes base64
  salt: z.string().min(43).regex(base64Regex, 'Must be base64'), // 32 bytes base64
});

const createSecretSchema = encryptedPayloadSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(SecretType).default(SecretType.CUSTOM),
  tags: z.array(z.string().max(50)).max(20).default([]),
  keyHint: z.string().max(50).optional(),
  expiresAt: z.coerce.date().optional(),
});

const updateSecretSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(SecretType).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  keyHint: z.string().max(50).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  // Optional re-encryption
  encryptedValue: z.string().min(1).regex(base64Regex).optional(),
  iv: z.string().min(16).regex(base64Regex).optional(),
  authTag: z.string().min(22).regex(base64Regex).optional(),
  salt: z.string().min(43).regex(base64Regex).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(SecretType).optional(),
  search: z.string().max(100).optional(),
});

// ─── Controller ──────────────────────────────────────────────────────────────

export class SecretsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createSecretSchema.parse(req.body);
      const { orgId, projectId } = req.params;

      const secret = await secretsService.create(
        projectId,
        orgId,
        req.user!.id,
        dto,
        req.ip,
      );

      res.status(201).json({ success: true, data: secret });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId, projectId } = req.params;
      const query = listQuerySchema.parse(req.query);

      const result = await secretsService.listByProject(projectId, orgId, query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns the encrypted payload for client-side decryption.
   * Separate endpoint to allow audit logging distinguishing "list" from "access".
   */
  async reveal(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId, secretId } = req.params;

      const secret = await secretsService.getSecretEncryptedPayload(
        secretId,
        orgId,
        req.user!.id,
        req.ip,
      );

      res.json({
        success: true,
        data: secret,
        _note: 'Decrypt this on the client using your master password. The server cannot decrypt this.',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateSecretSchema.parse(req.body);
      const { orgId, secretId } = req.params;

      const updated = await secretsService.update(
        secretId,
        orgId,
        req.user!.id,
        dto,
        req.ip,
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId, secretId } = req.params;
      const result = await secretsService.delete(secretId, orgId, req.user!.id, req.ip);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const secretsController = new SecretsController();
