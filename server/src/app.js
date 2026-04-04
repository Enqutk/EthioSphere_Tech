import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getCorsOrigin } from './config/index.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { challengesRouter } from './routes/challenges.js';
import { postsRouter } from './routes/posts.js';
import { messagesRouter } from './routes/messages.js';
import { followRouter } from './routes/follow.js';
import { adminRouter } from './routes/admin.js';

/**
 * Build the Express application (routes, middleware). Separated from listen() for clarity and tests.
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: getCorsOrigin(), credentials: true }));
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, message: 'Programmers World API' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/follow', followRouter);
  app.use('/api/admin', adminRouter);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
