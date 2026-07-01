import 'dotenv/config';
import express from 'express';

let app;

try {
  const { createApp } = await import('../src/app.js');
  app = createApp();
} catch (err) {
  console.error('App bootstrap failed:', err);
  app = express();
  const payload = { ok: false, error: 'Bootstrap failed', message: err?.message };
  app.get('/', (_req, res) => res.status(503).json(payload));
  app.get('/api/health', (_req, res) => res.status(503).json(payload));
}

export default app;
