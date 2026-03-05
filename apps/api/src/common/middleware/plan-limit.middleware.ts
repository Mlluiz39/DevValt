import { Request, Response, NextFunction } from 'express';
import { PlanType } from '@prisma/client';
import { prisma } from '../../database/prisma.client';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../../cache/redis.client';
import { AppError } from '../errors/app.error';

// ─── Plan Limits ─────────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<PlanType, {
  maxSecrets: number;
  maxProjects: number;
  maxMembers: number;
  maxApiKeys: number;
  rateLimitMultiplier: number;
  features: string[];
}> = {
  [PlanType.SOLO]: {
    maxSecrets: 50,
    maxProjects: 3,
    maxMembers: 1,
    maxApiKeys: 2,
    rateLimitMultiplier: 1,
    features: ['basic_encryption', 'audit_log_7d'],
  },
  [PlanType.TEAM]: {
    maxSecrets: 500,
    maxProjects: 20,
    maxMembers: 10,
    maxApiKeys: 10,
    rateLimitMultiplier: 2,
    features: ['basic_encryption', 'audit_log_90d', 'team_sharing', 'role_based_access'],
  },
  [PlanType.BUSINESS]: {
    maxSecrets: 5000,
    maxProjects: 100,
    maxMembers: 100,
    maxApiKeys: 50,
    rateLimitMultiplier: 5,
    features: [
      'basic_encryption',
      'audit_log_365d',
      'team_sharing',
      'role_based_access',
      'sso',
      'compliance_reports',
      'priority_support',
    ],
  },
  [PlanType.ENTERPRISE]: {
    maxSecrets: -1,     // Unlimited
    maxProjects: -1,
    maxMembers: -1,
    maxApiKeys: -1,
    rateLimitMultiplier: 10,
    features: [
      'basic_encryption',
      'audit_log_unlimited',
      'team_sharing',
      'role_based_access',
      'sso',
      'compliance_reports',
      'dedicated_support',
      'custom_domain',
      'private_cloud',
    ],
  },
};

// ─── Limit Checker Middleware Factory ────────────────────────────────────────

type LimitResource = 'secrets' | 'projects' | 'members' | 'apiKeys';

interface OrgLimitsCache {
  planType: PlanType;
  secretsCount: number;
  projectsCount: number;
  membersCount: number;
  apiKeysCount: number;
}

/**
 * Middleware factory: Checks plan limits before allowing resource creation.
 * 
 * @param resource - The resource type to check limits for
 */
export function checkPlanLimit(resource: LimitResource) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const orgId = req.currentOrg?.id ?? req.params.orgId;

    if (!orgId) {
      next(new AppError('Organization context required', 400, 'MISSING_ORG'));
      return;
    }

    (async () => {
      // Get cached limits or fetch from DB
      let limits = await cacheGet<OrgLimitsCache>(CACHE_KEYS.ORG_LIMITS(orgId));

      if (!limits) {
        const [org, secretsCount, projectsCount, membersCount, apiKeysCount] =
          await Promise.all([
            prisma.organization.findUnique({
              where: { id: orgId },
              select: { planType: true },
            }),
            prisma.secret.count({
              where: { project: { organizationId: orgId }, deletedAt: null },
            }),
            prisma.project.count({
              where: { organizationId: orgId, deletedAt: null },
            }),
            prisma.organizationMember.count({
              where: { organizationId: orgId },
            }),
            prisma.apiKey.count({
              where: { organizationId: orgId, status: 'ACTIVE' },
            }),
          ]);

        if (!org) throw new AppError('Organization not found', 404, 'ORG_NOT_FOUND');

        limits = {
          planType: org.planType,
          secretsCount,
          projectsCount,
          membersCount,
          apiKeysCount,
        };

        await cacheSet(CACHE_KEYS.ORG_LIMITS(orgId), limits, CACHE_TTL.SHORT);
      }

      const planConfig = PLAN_LIMITS[limits.planType];
      
      const limitMap: Record<LimitResource, { current: number; max: number }> = {
        secrets: { current: limits.secretsCount, max: planConfig.maxSecrets },
        projects: { current: limits.projectsCount, max: planConfig.maxProjects },
        members: { current: limits.membersCount, max: planConfig.maxMembers },
        apiKeys: { current: limits.apiKeysCount, max: planConfig.maxApiKeys },
      };

      const { current, max } = limitMap[resource];

      // -1 means unlimited (ENTERPRISE plan)
      if (max !== -1 && current >= max) {
        throw AppError.planLimitExceeded(resource);
      }

      next();
    })().catch(next);
  };
}

/**
 * Middleware: Validates that the organization has a feature enabled.
 */
export function requireFeature(feature: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const orgId = req.currentOrg?.id ?? req.params.orgId;
    if (!orgId) {
      next(new AppError('Organization context required', 400, 'MISSING_ORG'));
      return;
    }

    (async () => {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { planType: true },
      });

      if (!org) throw new AppError('Organization not found', 404, 'ORG_NOT_FOUND');

      const planFeatures = PLAN_LIMITS[org.planType].features;
      if (!planFeatures.includes(feature)) {
        throw new AppError(
          `This feature (${feature}) is not available on your current plan`,
          402,
          'FEATURE_NOT_IN_PLAN',
        );
      }

      next();
    })().catch(next);
  };
}
