import { Router } from 'express';
import { authenticate, requireActiveUser, requireOrgMember } from '../../common/middleware/auth.middleware';
import { auditService } from './audit.service';
import { MemberRole } from '@prisma/client';
import { z } from 'zod';

export const auditRouter = Router({ mergeParams: true });

auditRouter.use(authenticate, requireActiveUser);

auditRouter.get('/', requireOrgMember(MemberRole.ADMIN), async (req, res, next) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(50),
      userId: z.string().uuid().optional(),
      secretId: z.string().uuid().optional(),
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    });

    const query = querySchema.parse(req.query);
    const result = await auditService.getOrgLogs(req.params.orgId, query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
