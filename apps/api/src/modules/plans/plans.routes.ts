import { Router } from 'express';
import { PLAN_LIMITS } from '../../common/middleware/plan-limit.middleware';

export const plansRouter = Router();

// Public plans info endpoint
plansRouter.get('/', (_req, res) => {
  const plans = Object.entries(PLAN_LIMITS).map(([type, config]) => ({
    type,
    limits: {
      maxSecrets: config.maxSecrets === -1 ? 'Unlimited' : config.maxSecrets,
      maxProjects: config.maxProjects === -1 ? 'Unlimited' : config.maxProjects,
      maxMembers: config.maxMembers === -1 ? 'Unlimited' : config.maxMembers,
      maxApiKeys: config.maxApiKeys === -1 ? 'Unlimited' : config.maxApiKeys,
    },
    features: config.features,
  }));

  res.json({ success: true, data: plans });
});
