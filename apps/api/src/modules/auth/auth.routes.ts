import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate, requireActiveUser } from '../../common/middleware/auth.middleware';
import { authRateLimiter } from '../../common/middleware/rate-limit.middleware';

export const authRouter = Router();

// Public routes (rate limited)
authRouter.post('/register', authRateLimiter, authController.register.bind(authController));
authRouter.post('/login', authRateLimiter, authController.login.bind(authController));
authRouter.post('/2fa/verify', authRateLimiter, authController.verifyTwoFactor.bind(authController));
authRouter.post('/token/refresh', authController.refreshToken.bind(authController));

// Protected routes
authRouter.post('/logout', authenticate, authController.logout.bind(authController));
authRouter.get('/me', authenticate, requireActiveUser, authController.me.bind(authController));

// 2FA setup (requires active session)
authRouter.post('/2fa/setup', authenticate, requireActiveUser, authController.setupTwoFactor.bind(authController));
authRouter.post('/2fa/enable', authenticate, requireActiveUser, authController.enableTwoFactor.bind(authController));
