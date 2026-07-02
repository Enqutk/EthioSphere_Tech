import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { requireAuth } from '../middleware/auth.js';
import { getOrCreateDmThread } from '../lib/dmThread.js';
import {
  assertCanSendDm,
  assertCanViewDmThread,
  getDmBlockStatus,
  isDmMuted,
  listBlockedUsers,
} from '../lib/dmBlock.js';

export const messagesRouter = Router();

const userMiniSelect = { id: true, name: true, username: true, avatarUrl: true };

function otherParticipant(thread, meId) {
  return thread.user1Id === meId ? thread.user2 : thread.user1;
}

async function loadOtherUser(otherId) {
  if (!otherId) return null;
  return prisma.user.findUnique({ where: { id: otherId }, select: userMiniSelect });
}

// Users the current user has blocked (manage in Settings)
messagesRouter.get('/blocks', requireAuth, async (req, res) => {
  try {
    const users = await listBlockedUsers(prisma, req.user.id);
    res.json({ users });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/messages/blocks', 'Could not load blocked users');
  }
});

messagesRouter.post('/block/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    if (otherId === me) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }
    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) return res.status(404).json({ error: 'User not found' });

    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: otherId } },
      create: { blockerId: me, blockedId: otherId },
      update: {},
    });
    res.json({ ok: true, blocked: true });
  } catch (err) {
    sendRouteError(res, err, 'POST /api/messages/block/:userId', 'Could not block user');
  }
});

messagesRouter.delete('/block/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    await prisma.userBlock.deleteMany({
      where: { blockerId: me, blockedId: otherId },
    });
    res.json({ ok: true, blocked: false });
  } catch (err) {
    sendRouteError(res, err, 'DELETE /api/messages/block/:userId', 'Could not unblock user');
  }
});

messagesRouter.post('/mute/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    if (otherId === me) {
      return res.status(400).json({ error: 'You cannot mute yourself.' });
    }
    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) return res.status(404).json({ error: 'User not found' });

    await prisma.dmMute.upsert({
      where: { userId_mutedUserId: { userId: me, mutedUserId: otherId } },
      create: { userId: me, mutedUserId: otherId },
      update: {},
    });
    res.json({ ok: true, muted: true });
  } catch (err) {
    sendRouteError(res, err, 'POST /api/messages/mute/:userId', 'Could not mute conversation');
  }
});

messagesRouter.delete('/mute/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    await prisma.dmMute.deleteMany({
      where: { userId: me, mutedUserId: otherId },
    });
    res.json({ ok: true, muted: false });
  } catch (err) {
    sendRouteError(res, err, 'DELETE /api/messages/mute/:userId', 'Could not unmute conversation');
  }
});

// Block/mute flags for a user (does not create a DM thread)
messagesRouter.get('/status/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    if (otherId === me) {
      return res.status(400).json({ error: 'Invalid user.' });
    }
    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) return res.status(404).json({ error: 'User not found' });

    const [blockStatus, muted] = await Promise.all([
      getDmBlockStatus(prisma, me, otherId),
      isDmMuted(prisma, me, otherId),
    ]);
    res.json({
      blockedByMe: blockStatus.blockedByMe,
      blockedMe: blockStatus.blockedMe,
      muted,
      canSend: !blockStatus.blockedEitherWay,
    });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/messages/status/:userId', 'Could not load status');
  }
});

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

    const otherIds = threads.map((t) => (t.user1Id === me ? t.user2Id : t.user1Id));
    const uniqueOtherIds = [...new Set(otherIds)];

    const [blocksFromMe, blocksToMe, mutes] = await Promise.all([
      uniqueOtherIds.length
        ? prisma.userBlock.findMany({
            where: { blockerId: me, blockedId: { in: uniqueOtherIds } },
            select: { blockedId: true },
          })
        : [],
      uniqueOtherIds.length
        ? prisma.userBlock.findMany({
            where: { blockerId: { in: uniqueOtherIds }, blockedId: me },
            select: { blockerId: true },
          })
        : [],
      uniqueOtherIds.length
        ? prisma.dmMute.findMany({
            where: { userId: me, mutedUserId: { in: uniqueOtherIds } },
            select: { mutedUserId: true },
          })
        : [],
    ]);

    const blockedByMeIds = new Set(blocksFromMe.map((b) => b.blockedId));
    const blockedMeIds = new Set(blocksToMe.map((b) => b.blockerId));
    const mutedIds = new Set(mutes.map((m) => m.mutedUserId));

    const visibleThreads = threads.filter((t) => {
      const otherId = t.user1Id === me ? t.user2Id : t.user1Id;
      if (blockedMeIds.has(otherId)) return false;
      if (mutedIds.has(otherId)) return false;
      return true;
    });

    const threadIds = visibleThreads.map((t) => t.id);
    const unreadRows =
      threadIds.length > 0
        ? await prisma.dmMessage.groupBy({
            by: ['threadId'],
            where: { threadId: { in: threadIds }, senderId: { not: me }, readAt: null },
            _count: { _all: true },
          })
        : [];
    const unreadByThreadId = new Map(unreadRows.map((r) => [r.threadId, r._count._all]));

    const out = visibleThreads.map((t) => {
      const other = otherParticipant(t, me);
      const last = t.messages[0];
      const unreadCount = unreadByThreadId.get(t.id) || 0;
      return {
        threadId: t.id,
        otherUser: other,
        lastMessage: last
          ? { body: last.body.slice(0, 200), createdAt: last.createdAt, senderId: last.senderId, readAt: last.readAt }
          : null,
        unreadCount,
        updatedAt: t.updatedAt,
        blockedByMe: blockedByMeIds.has(other.id),
      };
    });
    res.json(out);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/messages/inbox', 'Could not load inbox');
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
    const other = await loadOtherUser(otherId);
    if (!other) return res.status(404).json({ error: 'User not found' });

    const viewDenied = await assertCanViewDmThread(prisma, me, otherId);
    if (viewDenied) return res.status(viewDenied.status).json({ error: viewDenied.error });

    const [blockStatus, muted] = await Promise.all([
      getDmBlockStatus(prisma, me, otherId),
      isDmMuted(prisma, me, otherId),
    ]);

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

    res.json({
      threadId: thread.id,
      otherUser: other,
      messages,
      blockedByMe: blockStatus.blockedByMe,
      blockedMe: blockStatus.blockedMe,
      muted,
      canSend: !blockStatus.blockedEitherWay,
    });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/messages/with/:userId', 'Could not load messages');
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

      const sendDenied = await assertCanSendDm(prisma, me, otherId);
      if (sendDenied) return res.status(sendDenied.status).json({ error: sendDenied.error });

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
      sendRouteError(res, err, 'POST /api/messages/with/:userId', 'Could not send message');
    }
  },
);
