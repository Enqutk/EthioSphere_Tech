import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { challengesRouter } from './routes/challenges.js';
import { postsRouter } from './routes/posts.js';
import { messagesRouter } from './routes/messages.js';
import { followRouter } from './routes/follow.js';
import { adminRouter } from './routes/admin.js';

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

// Security & parsing
// Reflect request origin when CLIENT_ORIGIN is unset so dev works on localhost, 127.0.0.1, or LAN IPs (with Vite proxy or direct API calls).
const rawCors = process.env.CLIENT_ORIGIN;
const corsOrigin =
  rawCors && rawCors.trim()
    ? rawCors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : true;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Programmers World API' });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/challenges', challengesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/follow', followRouter);
app.use('/api/admin', adminRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Programmers World API running at http://localhost:${PORT}`);
});
