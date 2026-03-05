import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { globalRateLimiter } from './common/middleware/rate-limit.middleware';
import { errorHandler } from './common/middleware/error-handler.middleware';
import { notFoundHandler } from './common/middleware/not-found.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

// Route imports
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { organizationsRouter } from './modules/organizations/organizations.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { secretsRouter } from './modules/secrets/secrets.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { apiKeysRouter } from './modules/api-keys/api-keys.routes';
import { plansRouter } from './modules/plans/plans.routes';

const app: Application = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
}));

// ─── General Middleware ──────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(requestIdMiddleware);

// ─── Logging ────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
    skip: (req) => req.url === '/health',
  }));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api/', globalRateLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DevVault API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/organizations`, organizationsRouter);
app.use(`${API_PREFIX}/organizations/:orgId/projects`, projectsRouter);
app.use(`${API_PREFIX}/organizations/:orgId/projects/:projectId/secrets`, secretsRouter);
app.use(`${API_PREFIX}/organizations/:orgId/audit`, auditRouter);
app.use(`${API_PREFIX}/organizations/:orgId/api-keys`, apiKeysRouter);
app.use(`${API_PREFIX}/plans`, plansRouter);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
