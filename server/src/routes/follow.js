import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { requireAuth } from '../middleware/auth.js';

export const followRouter = Router();

const userMiniSelect = { id: true, name: true, username: true, avatarUrl: true };

// Incoming follow requests (people who want to follow me)
followRouter.get('/requests/incoming', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.follow.findMany({
      where: { followingId: req.user.id, status: 'PENDING' },
      include: { follower: { select: userMiniSelect } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/follow/requests/incoming', 'Could not load requests');
  }
});

// Accept (only the followee)
followRouter.post('/requests/:id/accept', requireAuth, async (req, res) => {
  try {
    const row = await prisma.follow.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (row.followingId !== req.user.id) return res.status(403).json({ error: 'Not your request to accept' });
    if (row.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });
    const updated = await prisma.follow.update({
      where: { id: row.id },
      data: { status: 'ACCEPTED' },
      include: { follower: { select: userMiniSelect } },
    });
    res.json(updated);
  } catch (err) {
    sendRouteError(res, err, 'POST /api/follow/requests/:id/accept', 'Could not accept');
  }
});

// Reject
followRouter.post('/requests/:id/reject', requireAuth, async (req, res) => {
  try {
    const row = await prisma.follow.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (row.followingId !== req.user.id) return res.status(403).json({ error: 'Not your request to reject' });
    if (row.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });
    await prisma.follow.update({
      where: { id: row.id },
      data: { status: 'REJECTED' },
    });
    res.json({ message: 'Rejected' });
  } catch (err) {
    sendRouteError(res, err, 'POST /api/follow/requests/:id/reject', 'Could not reject');
  }
});

// Follow relationship from current user → target (for lightweight UI)
followRouter.get('/state/:username', requireAuth, async (req, res) => {
  try {
    const username = req.params.username.trim().toLowerCase();
    const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) {
      return res.json({ userId: target.id, self: true, followForViewer: null });
    }
    const outbound = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: target.id } },
    });
    const inbound = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: target.id, followingId: req.user.id } },
    });
    let followForViewer;
    if (outbound) {
      followForViewer = { direction: 'outbound', status: outbound.status, id: outbound.id };
    } else if (inbound) {
      followForViewer = { direction: 'inbound', status: inbound.status, id: inbound.id };
    } else {
      followForViewer = { direction: 'none', status: null, id: null };
    }
    res.json({ userId: target.id, self: false, followForViewer });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/follow/state/:username', 'Could not load follow state');
  }
});

// Send follow request to user by username
followRouter.post('/user/:username', requireAuth, async (req, res) => {
  try {
    const username = req.params.username.trim().toLowerCase();
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: target.id } },
    });
    if (existing?.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'Already following' });
    }
    if (existing?.status === 'PENDING') {
      return res.json({ status: 'PENDING', message: 'Request already pending', follow: existing });
    }
    if (existing?.status === 'REJECTED') {
      const updated = await prisma.follow.update({
        where: { id: existing.id },
        data: { status: 'PENDING' },
        include: { followee: { select: userMiniSelect } },
      });
      return res.status(201).json(updated);
    }

    const created = await prisma.follow.create({
      data: {
        followerId: req.user.id,
        followingId: target.id,
        status: 'PENDING',
      },
      include: { followee: { select: userMiniSelect } },
    });
    res.status(201).json(created);
  } catch (err) {
    sendRouteError(res, err, 'POST /api/follow/user/:username', 'Could not send follow request');
  }
});

// Cancel pending or unfollow (delete relationship)
followRouter.delete('/user/:username', requireAuth, async (req, res) => {
  try {
    const username = req.params.username.trim().toLowerCase();
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    await prisma.follow.deleteMany({
      where: { followerId: req.user.id, followingId: target.id },
    });
    res.json({ message: 'Unfollowed or request cancelled' });
  } catch (err) {
    sendRouteError(res, err, 'DELETE /api/follow/user/:username', 'Could not unfollow');
  }
});
