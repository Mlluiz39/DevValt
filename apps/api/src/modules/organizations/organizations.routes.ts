import { Router } from 'express';
import { hashPassword } from '../../crypto/crypto.service';
import { authenticate, requireActiveUser, requireOrgMember } from '../../common/middleware/auth.middleware';
import { prisma } from '../../database/prisma.client';
import { AppError } from '../../common/errors/app.error';
import { MemberRole } from '@prisma/client';
import { z } from 'zod';
import { auditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

export const organizationsRouter = Router();

organizationsRouter.use(authenticate, requireActiveUser);

// Get organization details
organizationsRouter.get('/:orgId', requireOrgMember(MemberRole.VIEWER), async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.orgId },
      include: {
        subscription: true,
        _count: {
          select: {
            members: true,
            projects: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!org) throw AppError.notFound('Organization not found');
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
});

// List members
organizationsRouter.get('/:orgId/members', requireOrgMember(MemberRole.VIEWER), async (req, res, next) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.params.orgId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});

// Invite member (simple - production would use email invitation)
organizationsRouter.post('/:orgId/members', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2).max(100).optional(),
      password: z.string().min(6).optional(),
      role: z.nativeEnum(MemberRole).default(MemberRole.MEMBER),
    });

    const { email, name, password, role } = schema.parse(req.body);

    // OWNER role cannot be assigned via invite
    if (role === MemberRole.OWNER) {
      throw AppError.forbidden('Cannot assign OWNER role via invite', 'CANNOT_ASSIGN_OWNER');
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!user) {
      if (!name || !password) {
        throw AppError.badRequest('User not found. To create a new user, provide name and password.');
      }
      const hashedPassword = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          email,
          name,
          hashedPassword,
        },
        select: { id: true, name: true }
      });
    }

    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: req.params.orgId,
          userId: user.id,
        },
      },
    });

    if (existing) throw AppError.conflict('User is already a member of this organization');

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: req.params.orgId,
        userId: user.id,
        role,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await auditService.log({
      organizationId: req.params.orgId,
      userId: req.user!.id,
      action: AuditAction.MEMBER_INVITED,
      ipAddress: req.ip,
      metadata: { invitedEmail: email, role },
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

// Update member role
organizationsRouter.patch('/:orgId/members/:userId', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.nativeEnum(MemberRole).optional(),
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
    });

    const { role, name, email, password } = schema.parse(req.body);

    if (role === MemberRole.OWNER) {
      throw AppError.forbidden('Cannot assign OWNER role', 'CANNOT_ASSIGN_OWNER');
    }

    // Attempt to update member role if provided
    let member;
    if (role) {
      member = await prisma.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: req.params.orgId,
            userId: req.params.userId,
          },
        },
        data: { role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    } else {
      member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: req.params.orgId,
            userId: req.params.userId,
          },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }

    if (!member) throw AppError.notFound('Member not found');

    // Update user profile if updates are provided
    if (name || email || password) {
       const userUpdateData: any = {};
       if (name) userUpdateData.name = name;
       if (email) userUpdateData.email = email;
       if (password) userUpdateData.hashedPassword = await hashPassword(password);

       await prisma.user.update({
         where: { id: req.params.userId },
         data: userUpdateData
       });
       
       // Refresh member data
       member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: req.params.orgId,
            userId: req.params.userId,
          },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }

    await auditService.log({
      organizationId: req.params.orgId,
      userId: req.user!.id,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      metadata: { targetUserId: req.params.userId, newRole: role },
    });

    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

// Remove member
organizationsRouter.delete('/:orgId/members/:userId', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    // Cannot remove the owner
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: req.params.orgId,
          userId: req.params.userId,
        },
      },
    });

    if (!member) throw AppError.notFound('Member not found');
    if (member.role === MemberRole.OWNER) {
      throw AppError.forbidden('Cannot remove the organization owner', 'CANNOT_REMOVE_OWNER');
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: req.params.orgId,
          userId: req.params.userId,
        },
      },
    });

    await auditService.log({
      organizationId: req.params.orgId,
      userId: req.user!.id,
      action: AuditAction.MEMBER_REMOVED,
      metadata: { removedUserId: req.params.userId },
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    next(error);
  }
});
