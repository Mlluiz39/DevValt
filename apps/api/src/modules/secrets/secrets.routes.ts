import { Router } from 'express';
import { secretsController } from './secrets.controller';
import { authenticate, requireActiveUser, requireOrgMember } from '../../common/middleware/auth.middleware';
import { checkPlanLimit } from '../../common/middleware/plan-limit.middleware';
import { MemberRole } from '@prisma/client';

export const secretsRouter = Router({ mergeParams: true });

// All secrets routes require authentication and org membership
secretsRouter.use(authenticate, requireActiveUser);

// POST /organizations/:orgId/projects/:projectId/secrets
secretsRouter.post(
  '/',
  requireOrgMember(MemberRole.MEMBER),
  checkPlanLimit('secrets'),
  secretsController.create.bind(secretsController),
);

// GET /organizations/:orgId/projects/:projectId/secrets
secretsRouter.get(
  '/',
  requireOrgMember(MemberRole.VIEWER),
  secretsController.list.bind(secretsController),
);

// GET /organizations/:orgId/projects/:projectId/secrets/:secretId/reveal
// Returns encrypted payload - logged as SECRET_READ audit event
secretsRouter.get(
  '/:secretId/reveal',
  requireOrgMember(MemberRole.MEMBER),
  secretsController.reveal.bind(secretsController),
);

// PATCH /organizations/:orgId/projects/:projectId/secrets/:secretId
secretsRouter.patch(
  '/:secretId',
  requireOrgMember(MemberRole.MEMBER),
  secretsController.update.bind(secretsController),
);

// DELETE /organizations/:orgId/projects/:projectId/secrets/:secretId
secretsRouter.delete(
  '/:secretId',
  requireOrgMember(MemberRole.ADMIN),
  secretsController.delete.bind(secretsController),
);
