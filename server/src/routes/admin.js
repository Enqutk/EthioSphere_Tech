import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
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
    sendRouteError(res, err, 'GET /api/admin/overview', 'Could not load overview');
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
    sendRouteError(res, err, 'GET /api/admin/posts', 'Could not list posts');
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
    sendRouteError(res, err, 'DELETE /api/admin/posts/:postId', 'Could not delete post');
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
        accountType: true,
        createdAt: true,
        isBanned: true,
        bannedAt: true,
        banExpiresAt: true,
        banReason: true,
        company: { select: { legalName: true } },
        _count: { select: { posts: true, projectsOwned: true } },
      },
    });
    res.json(users);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/admin/users', 'Could not list users');
  }
});

adminRouter.patch('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const banned = Boolean(req.body?.banned);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : null;
    let banExpiresAt = null;
    if (banned) {
      if (req.body?.banExpiresAt) {
        const parsed = new Date(req.body.banExpiresAt);
        if (!Number.isNaN(parsed.getTime())) banExpiresAt = parsed;
      } else if (typeof req.body?.banDays === 'number' && req.body.banDays > 0) {
        banExpiresAt = new Date(Date.now() + req.body.banDays * 24 * 60 * 60 * 1000);
      }
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot ban your own account.' });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true, username: true, accountType: true },
    });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.isAdmin) return res.status(403).json({ error: 'Cannot ban an administrator.' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: banned,
        bannedAt: banned ? new Date() : null,
        banExpiresAt: banned ? banExpiresAt : null,
        banReason: banned ? reason || 'Suspended by administrator' : null,
      },
      select: {
        id: true,
        username: true,
        accountType: true,
        isBanned: true,
        bannedAt: true,
        banExpiresAt: true,
        banReason: true,
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    sendRouteError(res, err, 'PATCH /api/admin/users/:userId/ban', 'Could not update ban status');
  }
});

adminRouter.get('/ban-appeals', async (req, res) => {
  try {
    const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)
      ? req.query.status
      : undefined;
    const appeals = await prisma.banAppeal.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        message: true,
        explanation: true,
        status: true,
        adminNote: true,
        createdAt: true,
        reviewedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            banReason: true,
            bannedAt: true,
            banExpiresAt: true,
          },
        },
      },
    });
    res.json(appeals);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/admin/ban-appeals', 'Could not list ban appeals');
  }
});

adminRouter.patch('/ban-appeals/:appealId', async (req, res) => {
  try {
    const status = req.body?.status;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
    }
    const adminNote = typeof req.body?.adminNote === 'string' ? req.body.adminNote.trim().slice(0, 500) : null;
    const unban = status === 'APPROVED' && req.body?.unban !== false;

    const appeal = await prisma.banAppeal.findUnique({
      where: { id: req.params.appealId },
      select: { id: true, userId: true, status: true },
    });
    if (!appeal) return res.status(404).json({ error: 'Appeal not found' });
    if (appeal.status !== 'PENDING') {
      return res.status(400).json({ error: 'This appeal has already been reviewed.' });
    }

    const [updated] = await prisma.$transaction([
      prisma.banAppeal.update({
        where: { id: appeal.id },
        data: { status, adminNote, reviewedAt: new Date() },
        select: {
          id: true,
          status: true,
          adminNote: true,
          reviewedAt: true,
          user: { select: { id: true, username: true, email: true } },
        },
      }),
      ...(unban
        ? [
            prisma.user.update({
              where: { id: appeal.userId },
              data: {
                isBanned: false,
                bannedAt: null,
                banExpiresAt: null,
                banReason: null,
              },
            }),
          ]
        : []),
    ]);

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Appeal not found' });
    sendRouteError(res, err, 'PATCH /api/admin/ban-appeals/:appealId', 'Could not update appeal');
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
    sendRouteError(res, err, 'DELETE /api/admin/users/:userId', 'Could not delete user');
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
    sendRouteError(res, err, 'DELETE /api/admin/challenges/:challengeId', 'Could not delete challenge');
  }
});

adminRouter.get('/companies/pending', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        legalName: true,
        website: true,
        description: true,
        verificationStatus: true,
        createdAt: true,
        user: { select: { id: true, username: true, name: true, email: true } },
        _count: { select: { reports: true, reviews: true } },
      },
    });
    res.json(companies);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/admin/companies/pending', 'Could not list companies');
  }
});

adminRouter.patch(
  '/companies/:companyId/verification',
  async (req, res) => {
    try {
      const status = req.body?.status;
      if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'status must be VERIFIED, REJECTED, or PENDING' });
      }
      const company = await prisma.company.update({
        where: { id: req.params.companyId },
        data: {
          verificationStatus: status,
          verificationNote: typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : null,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
        },
        select: {
          id: true,
          legalName: true,
          verificationStatus: true,
          verificationNote: true,
          verifiedAt: true,
          user: { select: { username: true } },
        },
      });
      res.json(company);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Company not found' });
      sendRouteError(res, err, 'PATCH /api/admin/companies/:companyId/verification', 'Could not update company');
    }
  }
);

adminRouter.get('/reports', async (req, res) => {
  try {
    const status = req.query.status === 'OPEN' ? 'OPEN' : undefined;
    const reports = await prisma.profileReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        reporter: { select: { id: true, username: true, name: true } },
        targetUser: { select: { id: true, username: true, name: true, accountType: true } },
        company: {
          select: {
            id: true,
            legalName: true,
            user: { select: { id: true, username: true } },
          },
        },
      },
    });
    res.json(reports);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/admin/reports', 'Could not list reports');
  }
});

adminRouter.patch('/reports/:reportId', async (req, res) => {
  try {
    const status = req.body?.status;
    if (!['DISMISSED', 'ACTIONED', 'OPEN'].includes(status)) {
      return res.status(400).json({ error: 'status must be DISMISSED, ACTIONED, or OPEN' });
    }
    const report = await prisma.profileReport.update({
      where: { id: req.params.reportId },
      data: { status },
      select: { id: true, status: true },
    });
    res.json(report);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Report not found' });
    sendRouteError(res, err, 'PATCH /api/admin/reports/:reportId', 'Could not update report');
  }
});
