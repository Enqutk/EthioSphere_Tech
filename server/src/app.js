import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getCorsOrigin, validateProductionConfig, isProductionEnv } from './config/index.js';
import { checkDatabaseHealth } from './lib/health.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { challengesRouter } from './routes/challenges.js';
import { postsRouter } from './routes/posts.js';
import { messagesRouter } from './routes/messages.js';
import { followRouter } from './routes/follow.js';
import { companiesRouter } from './routes/companies.js';
import { reportsRouter } from './routes/reports.js';
import { adminRouter } from './routes/admin.js';
import { notificationsRouter } from './routes/notifications.js';

/**
 * Build the Express application (routes, middleware). Separated from listen() for clarity and tests.
 */
export function createApp() {
  validateProductionConfig();

  const app = express();

  if (process.env.VERCEL) {
    app.set('trust proxy', 1);
  }

  app.use(cors({ origin: getCorsOrigin(), credentials: true }));
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json());

  const rateLimitOpts = process.env.VERCEL ? { validate: { xForwardedForHeader: false } } : {};

  if (process.env.NODE_ENV !== 'test') {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many auth attempts, please try again later.' },
      // Status/OAuth GETs run on every login page load and must not hide Google sign-in.
      skip: (req) => {
        if (req.method !== 'GET') return false;
        const path = String(req.originalUrl || req.url || '').split('?')[0];
        return (
          path === '/api/auth/google/status' ||
          path === '/api/auth/google' ||
          path.startsWith('/api/auth/google/callback')
        );
      },
      ...rateLimitOpts,
    });

    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
      skip: (req) => req.originalUrl.startsWith('/api/auth'),
      ...rateLimitOpts,
    });

    app.use('/api/auth', authLimiter);
    app.use('/api', apiLimiter);
  }

  app.get('/', (req, res) => {
    res.json({ ok: true, message: 'Programmers World API', health: '/api/health' });
  });

  app.get('/api/health', async (req, res) => {
    const dbHealth = await checkDatabaseHealth();
    const ok = dbHealth.ok;
    res.status(ok ? 200 : 503).json({
      ok,
      message: 'Programmers World API',
      db: ok ? 'ok' : 'error',
      ...(!ok && !isProductionEnv() && dbHealth.error ? { dbError: dbHealth.error } : {}),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/follow', followRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
