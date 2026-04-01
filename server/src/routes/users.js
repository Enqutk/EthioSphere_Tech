import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export const usersRouter = Router();

// Get current user profile (authenticated)
usersRouter.get('/me', requireAuth, async (req, res) => {
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
      projectsOwned: { select: { id: true, title: true, status: true } },
      badges: { select: { badgeType: true, earnedAt: true } },
    },
  });
  res.json(full);
});

// Get public profile by username
usersRouter.get('/:username', optionalAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username.toLowerCase() },
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
});

// Update own profile
usersRouter.patch(
  '/me',
  requireAuth,
  [
    body('name').optional().trim().notEmpty(),
    body('bio').optional().trim(),
    body('githubUrl').optional({ checkFalsy: true }).isURL().withMessage('Must be a valid URL'),
    body('skills').optional().isArray(),
    body('skills.*').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, bio, githubUrl, skills } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio;
    if (githubUrl !== undefined) data.githubUrl = githubUrl || null;
    if (skills !== undefined) data.skills = skills;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, username: true, avatarUrl: true, bio: true, rank: true, githubUrl: true, skills: true },
    });
    res.json(user);
  }
);
