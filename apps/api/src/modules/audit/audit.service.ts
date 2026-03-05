import { prisma } from '../../database/prisma.client';
import { AuditAction } from '@prisma/client';
import { logger } from '../../config/logger';

export interface AuditLogEntry {
  organizationId?: string;
  projectId?: string;
  secretId?: string;
  userId?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Creates an audit log entry.
   * SECURITY: metadata must NEVER contain secrets or encrypted values.
   * Only log metadata like names, IDs, and action context.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize metadata - remove any potentially sensitive fields
      const sanitizedMetadata = entry.metadata
        ? this.sanitizeMetadata(entry.metadata)
        : undefined;

      await prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          projectId: entry.projectId,
          secretId: entry.secretId,
          userId: entry.userId,
          action: entry.action,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: sanitizedMetadata,
        },
      });
    } catch (error) {
      // Audit failures should not break the main operation
      logger.error('Failed to write audit log', {
        action: entry.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Retrieves paginated audit logs for an organization.
   */
  async getOrgLogs(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      action?: AuditAction;
      userId?: string;
      secretId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const { page = 1, limit = 50, action, userId, secretId, fromDate, toDate } = options;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(action && { action }),
      ...(userId && { userId }),
      ...(secretId && { secretId }),
      ...((fromDate || toDate) && {
        createdAt: {
          ...(fromDate && { gte: fromDate }),
          ...(toDate && { lte: toDate }),
        },
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          secret: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const FORBIDDEN_KEYS = [
      'password', 'secret', 'token', 'key', 'encryptedValue',
      'iv', 'authTag', 'salt', 'hash', 'credential',
    ];

    return Object.entries(metadata).reduce((acc, [k, v]) => {
      const isForbidden = FORBIDDEN_KEYS.some(fk =>
        k.toLowerCase().includes(fk.toLowerCase())
      );

      if (!isForbidden) {
        acc[k] = typeof v === 'object' && v !== null
          ? '[complex value]'
          : v;
      }

      return acc;
    }, {} as Record<string, unknown>);
  }
}

export const auditService = new AuditService();
