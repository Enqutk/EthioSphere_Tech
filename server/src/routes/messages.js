import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getOrCreateDmThread } from '../lib/dmThread.js';

export const messagesRouter = Router();

const userMiniSelect = { id: true, name: true, username: true, avatarUrl: true };

function otherParticipant(thread, meId) {
  return thread.user1Id === meId ? thread.user2 : thread.user1;
}

// Inbox: all threads for current user with last message preview
messagesRouter.get('/inbox', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const threads = await prisma.dmThread.findMany({
      where: { OR: [{ user1Id: me }, { user2Id: me }] },
      include: {
        user1: { select: userMiniSelect },
        user2: { select: userMiniSelect },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    const out = threads.map((t) => {
      const other = otherParticipant(t, me);
      const last = t.messages[0];
      return {
        threadId: t.id,
        otherUser: other,
        lastMessage: last
          ? { body: last.body.slice(0, 200), createdAt: last.createdAt, senderId: last.senderId, readAt: last.readAt }
          : null,
        updatedAt: t.updatedAt,
      };
    });
    res.json(out);
  } catch (err) {
    console.error('GET /api/messages/inbox', err);
    const hint =
      err.code === 'P2021' || /does not exist|relation .* not found/i.test(String(err.message))
        ? 'Run `npx prisma db push` in the server folder so dm_threads and dm_messages exist.'
        : undefined;
    res.status(500).json({ error: 'Could not load inbox', ...(hint && { hint }) });
  }
});

// Messages with another user (by their user id)
messagesRouter.get('/with/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    if (otherId === me) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }
    const other = await prisma.user.findUnique({ where: { id: otherId }, select: userMiniSelect });
    if (!other) return res.status(404).json({ error: 'User not found' });

    const thread = await getOrCreateDmThread(prisma, me, otherId);
    const messages = await prisma.dmMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: userMiniSelect } },
    });

    await prisma.dmMessage.updateMany({
      where: { threadId: thread.id, senderId: otherId, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ threadId: thread.id, otherUser: other, messages });
  } catch (err) {
    console.error('GET /api/messages/with/:userId', err);
    const hint =
      err.code === 'P2021' || /does not exist|relation .* not found/i.test(String(err.message))
        ? 'Run `npx prisma db push` in the server folder so dm_threads and dm_messages exist.'
        : undefined;
    res.status(500).json({ error: 'Could not load messages', ...(hint && { hint }) });
  }
});

messagesRouter.post(
  '/with/:userId',
  requireAuth,
  [body('body').trim().notEmpty().isLength({ min: 1, max: 8000 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const me = req.user.id;
      const otherId = req.params.userId;
      if (otherId === me) {
        return res.status(400).json({ error: 'Cannot message yourself' });
      }
      const other = await prisma.user.findUnique({ where: { id: otherId } });
      if (!other) return res.status(404).json({ error: 'User not found' });

      const thread = await getOrCreateDmThread(prisma, me, otherId);
      const msg = await prisma.dmMessage.create({
        data: {
          threadId: thread.id,
          senderId: me,
          body: req.body.body.trim(),
        },
        include: { sender: { select: userMiniSelect } },
      });
      await prisma.dmThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });
      res.status(201).json(msg);
    } catch (err) {
      console.error('POST /api/messages/with/:userId', err);
      const hint =
        err.code === 'P2021' || /does not exist|relation .* not found/i.test(String(err.message))
          ? 'Run `npx prisma db push` in the server folder so dm_threads and dm_messages exist.'
          : undefined;
      res.status(500).json({ error: 'Could not send message', ...(hint && { hint }) });
    }
  },
);
