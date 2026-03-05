import { prisma } from '../../database/prisma.client';
import { AppError } from '../../common/errors/app.error';
import { validateEncryptedPayload, EncryptedPayload } from '../../crypto/crypto.service';
import { AuditAction, SecretType } from '@prisma/client';
import { auditService } from '../audit/audit.service';
import { logger } from '../../config/logger';

export interface CreateSecretDto {
  name: string;
  description?: string;
  type: SecretType;
  tags?: string[];
  keyHint?: string;
  expiresAt?: Date;
  // Zero-Knowledge encrypted payload — server never decrypts this
  encryptedValue: string;
  iv: string;
  authTag: string;
  salt: string;
}

export interface UpdateSecretDto {
  name?: string;
  description?: string;
  type?: SecretType;
  tags?: string[];
  keyHint?: string;
  expiresAt?: Date;
  // Optional re-encryption fields (if the value changes)
  encryptedValue?: string;
  iv?: string;
  authTag?: string;
  salt?: string;
}

// ─── Secrets Service ─────────────────────────────────────────────────────────

export class SecretsService {
  /**
   * Creates a new secret.
   * 
   * SECURITY: The server validates the payload structure but NEVER decrypts or
   * processes the encrypted value. We only store the ZK-encrypted blob.
   */
  async create(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: CreateSecretDto,
    ipAddress?: string,
  ) {
    // Validate encrypted payload structure
    const payload: Partial<EncryptedPayload> = {
      encryptedValue: dto.encryptedValue,
      iv: dto.iv,
      authTag: dto.authTag,
      salt: dto.salt,
    };

    if (!validateEncryptedPayload(payload)) {
      throw AppError.badRequest(
        'Invalid encrypted payload. Ensure encryptedValue, iv (12 bytes), authTag (16 bytes), and salt (32 bytes) are provided as base64.',
        'INVALID_ENCRYPTED_PAYLOAD',
      );
    }

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
    }

    // Check for duplicate name in project
    const duplicate = await prisma.secret.findFirst({
      where: { projectId, name: dto.name, deletedAt: null },
      select: { id: true },
    });

    if (duplicate) {
      throw AppError.conflict(
        `A secret named "${dto.name}" already exists in this project`,
        'SECRET_NAME_DUPLICATE',
      );
    }

    const secret = await prisma.secret.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? SecretType.CUSTOM,
        tags: dto.tags ?? [],
        keyHint: dto.keyHint,
        expiresAt: dto.expiresAt,
        // ZK encrypted fields — stored as-is, server never reads these
        encryptedValue: dto.encryptedValue,
        iv: dto.iv,
        authTag: dto.authTag,
        salt: dto.salt,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        tags: true,
        keyHint: true,
        expiresAt: true,
        // NOTE: We DO NOT return encryptedValue, iv, authTag, salt here
        // The client that created it already has the plaintext
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    await auditService.log({
      organizationId,
      projectId,
      secretId: secret.id,
      userId,
      action: AuditAction.SECRET_CREATED,
      ipAddress,
      metadata: { secretName: dto.name, secretType: dto.type },
    });

    logger.info('Secret created', {
      secretId: secret.id,
      projectId,
      userId,
      // NEVER log secretName if it contains sensitive info
    });

    return secret;
  }

  /**
   * Lists secrets in a project — returns metadata only, NOT encrypted values.
   * Clients must call getSecretEncryptedPayload() separately to retrieve
   * the encrypted blob for client-side decryption.
   */
  async listByProject(
    projectId: string,
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      type?: SecretType;
      search?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, type, search } = options;
    const skip = (page - 1) * limit;

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!project) throw AppError.notFound('Project not found');

    const where = {
      projectId,
      deletedAt: null,
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { tags: { has: search } },
        ],
      }),
    };

    const [secrets, total] = await Promise.all([
      prisma.secret.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          tags: true,
          keyHint: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          // DO NOT include encryptedValue, iv, authTag, salt in list view
        },
      }),
      prisma.secret.count({ where }),
    ]);

    return {
      secrets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns the ENCRYPTED payload for client-side decryption.
   * This is logged in the audit trail as SECRET_READ.
   * The server still never decrypts the value.
   */
  async getSecretEncryptedPayload(
    secretId: string,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const secret = await prisma.secret.findFirst({
      where: {
        id: secretId,
        project: { organizationId },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        tags: true,
        keyHint: true,
        expiresAt: true,
        projectId: true,
        // Return encrypted payload for client-side decryption
        encryptedValue: true,
        iv: true,
        authTag: true,
        salt: true,
      },
    });

    if (!secret) throw AppError.notFound('Secret not found', 'SECRET_NOT_FOUND');

    // Check expiry
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new AppError('This secret has expired', 410, 'SECRET_EXPIRED');
    }

    // Audit log — track who accessed which secret
    await auditService.log({
      organizationId,
      projectId: secret.projectId,
      secretId: secret.id,
      userId,
      action: AuditAction.SECRET_READ,
      ipAddress,
      metadata: { secretName: secret.name },
    });

    return secret;
  }

  /**
   * Updates secret metadata and/or re-encrypts the value.
   * If new encryption fields provided, validates their structure.
   */
  async update(
    secretId: string,
    organizationId: string,
    userId: string,
    dto: UpdateSecretDto,
    ipAddress?: string,
  ) {
    const secret = await prisma.secret.findFirst({
      where: {
        id: secretId,
        project: { organizationId },
        deletedAt: null,
      },
      select: { id: true, projectId: true, name: true },
    });

    if (!secret) throw AppError.notFound('Secret not found', 'SECRET_NOT_FOUND');

    // If new encrypted value provided, validate its structure
    if (dto.encryptedValue || dto.iv || dto.authTag || dto.salt) {
      const payload: Partial<EncryptedPayload> = {
        encryptedValue: dto.encryptedValue,
        iv: dto.iv,
        authTag: dto.authTag,
        salt: dto.salt,
      };

      if (!validateEncryptedPayload(payload)) {
        throw AppError.badRequest('Invalid encrypted payload structure', 'INVALID_ENCRYPTED_PAYLOAD');
      }
    }

    const updated = await prisma.secret.update({
      where: { id: secretId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type && { type: dto.type }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.keyHint !== undefined && { keyHint: dto.keyHint }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
        // Only update encryption fields if all are provided
        ...(dto.encryptedValue && dto.iv && dto.authTag && dto.salt && {
          encryptedValue: dto.encryptedValue,
          iv: dto.iv,
          authTag: dto.authTag,
          salt: dto.salt,
        }),
      },
      select: {
        id: true, name: true, description: true, type: true,
        tags: true, keyHint: true, expiresAt: true, updatedAt: true,
      },
    });

    await auditService.log({
      organizationId,
      projectId: secret.projectId,
      secretId,
      userId,
      action: AuditAction.SECRET_UPDATED,
      ipAddress,
      metadata: {
        secretName: updated.name,
        valueChanged: !!(dto.encryptedValue),
      },
    });

    return updated;
  }

  /**
   * Soft-deletes a secret.
   */
  async delete(
    secretId: string,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const secret = await prisma.secret.findFirst({
      where: {
        id: secretId,
        project: { organizationId },
        deletedAt: null,
      },
      select: { id: true, projectId: true, name: true },
    });

    if (!secret) throw AppError.notFound('Secret not found', 'SECRET_NOT_FOUND');

    await prisma.secret.update({
      where: { id: secretId },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      organizationId,
      projectId: secret.projectId,
      secretId,
      userId,
      action: AuditAction.SECRET_DELETED,
      ipAddress,
      metadata: { secretName: secret.name },
    });

    return { deleted: true };
  }
}

export const secretsService = new SecretsService();
