import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', async (req, res) => {
  try {
    const [users, posts, challenges, projects] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.challenge.count(),
      prisma.project.count(),
    ]);
    res.json({ users, posts, challenges, projects });
  } catch (err) {
    console.error('GET /api/admin/overview', err);
    res.status(500).json({ error: 'Could not load overview' });
  }
});

adminRouter.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        section: true,
        createdAt: true,
        author: { select: { id: true, username: true, name: true } },
      },
    });
    res.json(posts);
  } catch (err) {
    console.error('GET /api/admin/posts', err);
    res.status(500).json({ error: 'Could not list posts' });
  }
});

adminRouter.delete('/posts/:postId', async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: req.params.postId } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Post not found' });
    }
    console.error('DELETE /api/admin/posts/:postId', err);
    res.status(500).json({ error: 'Could not delete post' });
  }
});

adminRouter.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { posts: true, projectsOwned: true } },
      },
    });
    res.json(users);
  } catch (err) {
    console.error('GET /api/admin/users', err);
    res.status(500).json({ error: 'Could not list users' });
  }
});

adminRouter.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account here.' });
    }
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete another administrator.' });
    }
    await prisma.user.delete({ where: { id: userId } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('DELETE /api/admin/users/:userId', err);
    res.status(500).json({ error: 'Could not delete user' });
  }
});

adminRouter.delete('/challenges/:challengeId', async (req, res) => {
  try {
    await prisma.challenge.delete({ where: { id: req.params.challengeId } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    console.error('DELETE /api/admin/challenges/:challengeId', err);
    res.status(500).json({ error: 'Could not delete challenge' });
  }
});
