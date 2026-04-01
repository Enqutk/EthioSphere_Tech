import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

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
        skills: true,
        createdAt: true,
      },
    });
    if (!full) return res.status(404).json({ error: 'User not found' });
    res.json(full);
  } catch (err) {
    console.error('GET /api/users/me', err);
    const dev = process.env.NODE_ENV !== 'production';
    const code = err.code;
    const hint =
      code === 'P2022' || /column .* does not exist|Unknown column/i.test(String(err.message))
        ? 'Run `npx prisma db push` from the server folder so the database matches the Prisma schema.'
        : /reach database server at/i.test(String(err.message))
          ? 'Database is unreachable — wake the project in the Neon dashboard and check DATABASE_URL.'
          : undefined;
    res.status(500).json({
      error: 'Could not load profile',
      ...(dev && { details: err.message, code }),
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
        skills: true,
        projectsOwned: { select: { id: true, title: true, status: true, type: true } },
        badges: { select: { badgeType: true, earnedAt: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('GET /api/users/:username', err);
    const dev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Could not load profile',
      ...(dev && { details: err.message }),
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
    body('skills').optional().isArray(),
    body('skills.*').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { name, bio, githubUrl, skills } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (bio !== undefined) data.bio = bio === '' ? null : bio;
      if (githubUrl !== undefined) data.githubUrl = githubUrl || null;
      if (skills !== undefined) data.skills = skills;
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
        select: { id: true, name: true, username: true, avatarUrl: true, bio: true, rank: true, githubUrl: true, skills: true },
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
