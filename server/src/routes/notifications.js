import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { sendRouteError } from '../lib/dbErrors.js';
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  upsertFcmToken,
  removeFcmToken,
} from '../services/notifications.js';
import { isFirebaseConfigured } from '../lib/firebaseAdmin.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const items = await listNotifications(req.user.id, { limit, cursor });
    res.json(items);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/notifications', 'Could not load notifications');
  }
});

notificationsRouter.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await unreadNotificationCount(req.user.id);
    res.json({ count, pushConfigured: isFirebaseConfigured() });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/notifications/unread-count', 'Could not load count');
  }
});

notificationsRouter.post('/read-all', requireAuth, async (req, res) => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    sendRouteError(res, err, 'POST /api/notifications/read-all', 'Could not mark read');
  }
});

notificationsRouter.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const out = await markNotificationRead(req.user.id, req.params.id);
    if (out.notFound) return res.status(404).json({ error: 'Notification not found' });
    res.json(out.notification);
  } catch (err) {
    sendRouteError(res, err, 'POST /api/notifications/:id/read', 'Could not mark read');
  }
});

notificationsRouter.post(
  '/fcm-token',
  requireAuth,
  [body('token').trim().notEmpty().isLength({ max: 4096 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const out = await upsertFcmToken(req.user.id, req.body.token);
      if (out.badRequest) return res.status(400).json({ error: 'Invalid token' });
      res.json({ ok: true });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/notifications/fcm-token', 'Could not save token');
    }
  },
);

notificationsRouter.delete(
  '/fcm-token',
  requireAuth,
  [body('token').optional().trim().isLength({ max: 4096 })],
  async (req, res) => {
    try {
      await removeFcmToken(req.user.id, req.body?.token || '');
      res.json({ ok: true });
    } catch (err) {
      sendRouteError(res, err, 'DELETE /api/notifications/fcm-token', 'Could not remove token');
    }
  },
);
