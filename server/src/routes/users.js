import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { extrasForPrismaError } from '../lib/dbErrors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { ownedProjectsVisibleWhere } from '../lib/projectAccess.js';

export const usersRouter = Router();

// Get current user (authenticated) — scalars only so edit/settings never fail on relation/DB drift
usersRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const full = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        rank: true,
        githubUrl: true,
        portfolioUrl: true,
        skills: true,
        isAdmin: true,
        createdAt: true,
      },
    });
    if (!full) return res.status(404).json({ error: 'User not found' });
    res.json(full);
  } catch (err) {
    console.error('GET /api/users/me', err);
    const dev = process.env.NODE_ENV !== 'production';
    const { hint, prismaCode } = extrasForPrismaError(err);
    res.status(500).json({
      error: 'Could not load profile',
      ...(dev && { details: err.message, code: prismaCode }),
      ...(hint && { hint }),
    });
  }
});

// Discover people (search + previews) — must be registered before GET /:username
usersRouter.get('/discover', optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const skill = String(req.query.skill || '').trim();
    const viewerId = req.user?.id;
    const take = Math.min(40, Math.max(1, parseInt(String(req.query.limit), 10) || 24));

    const andParts = [];
    if (viewerId) andParts.push({ NOT: { id: viewerId } });
    if (skill) andParts.push({ skills: { has: skill } });
    if (q) {
      andParts.push({
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where = andParts.length ? { AND: andParts } : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        rank: true,
        skills: true,
        projectsOwned: {
          where: { visibility: 'PUBLIC' },
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { id: true, title: true, githubFullName: true },
        },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { id: true, title: true, section: true },
        },
      },
    });

    const followByUserId = {};
    if (viewerId && users.length > 0) {
      const ids = users.map((u) => u.id);
      const [outboundRows, inboundRows] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: ids } },
        }),
        prisma.follow.findMany({
          where: { followerId: { in: ids }, followingId: viewerId },
        }),
      ]);
      for (const u of users) {
        const ob = outboundRows.find((f) => f.followingId === u.id);
        const ib = inboundRows.find((f) => f.followerId === u.id);
        if (ob) {
          followByUserId[u.id] = { direction: 'outbound', status: ob.status, id: ob.id };
        } else if (ib) {
          followByUserId[u.id] = { direction: 'inbound', status: ib.status, id: ib.id };
        } else {
          followByUserId[u.id] = { direction: 'none', status: null, id: null };
        }
      }
    }

    const RANK_LABELS = {
      NEWBIE: 'Newbie',
      JUNIOR_DEV: 'Junior Dev',
      PRO_DEV: 'Pro Dev',
      ELITE_ARCHITECT: 'Elite Architect',
    };

    res.json(
      users.map((u) => ({
        ...u,
        rankLabel: RANK_LABELS[u.rank] || u.rank,
        followForViewer: viewerId ? followByUserId[u.id] : null,
      })),
    );
  } catch (err) {
    console.error('GET /api/users/discover', err);
    const dev = process.env.NODE_ENV !== 'production';
    const { hint, prismaCode } = extrasForPrismaError(err);
    res.status(500).json({
      error: 'Could not search people',
      ...(dev && { details: err.message, code: prismaCode }),
      ...(hint && { hint }),
    });
  }
});

// Get public profile by username
usersRouter.get('/:username', optionalAuth, async (req, res) => {
  try {
    const raw = req.params.username;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }
    const username = raw.trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        rank: true,
        githubUrl: true,
        portfolioUrl: true,
        skills: true,
        badges: { select: { badgeType: true, earnedAt: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const viewerId = req.user?.id;
    const projectsOwned = await prisma.project.findMany({
      where: ownedProjectsVisibleWhere(user.id, viewerId),
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        visibility: true,
        seekingReview: true,
        githubFullName: true,
        githubHtmlUrl: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const [followersAccepted, followingAccepted] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id, status: 'ACCEPTED' } }),
      prisma.follow.count({ where: { followerId: user.id, status: 'ACCEPTED' } }),
    ]);

    let followForViewer = null;
    if (viewerId && viewerId !== user.id) {
      const outbound = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
      });
      const inbound = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: user.id, followingId: viewerId } },
      });
      if (outbound) {
        followForViewer = { direction: 'outbound', status: outbound.status, id: outbound.id };
      } else if (inbound) {
        followForViewer = { direction: 'inbound', status: inbound.status, id: inbound.id };
      } else {
        followForViewer = { direction: 'none', status: null, id: null };
      }
    }

    res.json({
      ...user,
      projectsOwned,
      followersCount: followersAccepted,
      followingCount: followingAccepted,
      followForViewer,
    });
  } catch (err) {
    console.error('GET /api/users/:username', err);
    const dev = process.env.NODE_ENV !== 'production';
    const { hint, prismaCode } = extrasForPrismaError(err);
    res.status(500).json({
      error: 'Could not load profile',
      ...(dev && { details: err.message, code: prismaCode }),
      ...(hint && { hint }),
    });
  }
});

// Update own profile
usersRouter.patch(
  '/me',
  requireAuth,
  [
    body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
    body('bio').optional({ values: 'null' }).isString().trim(),
    body('githubUrl')
      .optional({ values: 'falsy' })
      .isString()
      .trim()
      .isURL({ require_protocol: true, require_valid_protocol: true })
      .withMessage('Must be a valid URL (include https://)'),
    body('portfolioUrl')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value !== 'string') return false;
        const t = value.trim();
        if (!t) return true;
        if (t.length > 2048) return false;
        try {
          const u = new URL(t);
          if (!['http:', 'https:'].includes(u.protocol)) return false;
        } catch {
          return false;
        }
        return true;
      })
      .withMessage('Portfolio must be a valid http(s) URL or empty'),
    body('skills').optional().isArray(),
    body('skills.*').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { name, bio, githubUrl, portfolioUrl, skills } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (bio !== undefined) data.bio = bio === '' ? null : bio;
      if (githubUrl !== undefined) data.githubUrl = githubUrl || null;
      if (portfolioUrl !== undefined) {
        data.portfolioUrl =
          portfolioUrl === null || portfolioUrl === '' ? null : String(portfolioUrl).trim() || null;
      }
      if (skills !== undefined) data.skills = skills;
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          rank: true,
          githubUrl: true,
          portfolioUrl: true,
          skills: true,
          isAdmin: true,
        },
      });
      res.json(user);
    } catch (err) {
      console.error('PATCH /api/users/me', err);
      const dev = process.env.NODE_ENV !== 'production';
      const code = err.code;
      const hint =
        code === 'P2022' || /column .* does not exist|Unknown column/i.test(String(err.message))
          ? 'Run `npx prisma db push` from the server folder so the database matches schema (e.g. updated_at on User).'
          : undefined;
      res.status(500).json({
        error: 'Could not update profile',
        ...(dev && { details: err.message, code }),
        ...(hint && { hint }),
      });
    }
  }
);
