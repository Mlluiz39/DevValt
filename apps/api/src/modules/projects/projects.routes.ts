import { Router } from 'express';
import { authenticate, requireActiveUser, requireOrgMember } from '../../common/middleware/auth.middleware';
import { prisma } from '../../database/prisma.client';
import { AppError } from '../../common/errors/app.error';
import { MemberRole } from '@prisma/client';
import { z } from 'zod';
import { auditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { checkPlanLimit } from '../../common/middleware/plan-limit.middleware';

export const projectsRouter = Router({ mergeParams: true });

projectsRouter.use(authenticate, requireActiveUser);

// Create project
projectsRouter.post(
  '/',
  requireOrgMember(MemberRole.ADMIN),
  checkPlanLimit('projects'),
  async (req, res, next) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      });

      const dto = schema.parse(req.body);
      const slug = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      const project = await prisma.project.create({
        data: {
          organizationId: req.params.orgId,
          name: dto.name,
          slug: `${slug}-${Date.now()}`,
          description: dto.description,
          color: dto.color,
        },
      });

      await auditService.log({
        organizationId: req.params.orgId,
        projectId: project.id,
        userId: req.user!.id,
        action: AuditAction.PROJECT_CREATED,
        ipAddress: req.ip,
        metadata: { projectName: project.name },
      });

      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }
);

// List projects
projectsRouter.get('/', requireOrgMember(MemberRole.VIEWER), async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId: req.params.orgId, deletedAt: null },
      include: {
        _count: { select: { secrets: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// Get project by ID
projectsRouter.get('/:projectId', requireOrgMember(MemberRole.VIEWER), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        organizationId: req.params.orgId,
        deletedAt: null,
      },
    });

    if (!project) throw AppError.notFound('Project not found');
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// Update project
projectsRouter.patch('/:projectId', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });

    const dto = schema.parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: dto,
    });

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// Delete project (soft delete)
projectsRouter.delete('/:projectId', requireOrgMember(MemberRole.OWNER), async (req, res, next) => {
  try {
    await prisma.project.update({
      where: { id: req.params.projectId },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
});
