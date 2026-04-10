import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { sendRouteError } from '../lib/dbErrors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  normalizeProfileSections,
  getCurrentUserProfile,
  discoverUsers,
  getPublicProfileByUsername,
  updateCurrentUserProfile,
} from '../services/usersService.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const full = await getCurrentUserProfile(req.user.id);
    if (!full) return res.status(404).json({ error: 'User not found' });
    res.json(full);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/users/me', 'Could not load profile');
  }
});

usersRouter.get('/discover', optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const skill = String(req.query.skill || '').trim();
    const viewerId = req.user?.id;
    const take = Math.min(40, Math.max(1, parseInt(String(req.query.limit), 10) || 24));

    const { users, followByUserId } = await discoverUsers({ q, skill, viewerId, take });
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
    sendRouteError(res, err, 'GET /api/users/discover', 'Could not search people');
  }
});

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

    const profile = await getPublicProfileByUsername(username, req.user?.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/users/:username', 'Could not load profile');
  }
});

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
    body('profileSections').optional().isArray().withMessage('profileSections must be an array'),
    body('profileSections.*.title').optional().isString().isLength({ min: 1, max: 80 }),
    body('profileSections.*.content').optional().isString().isLength({ min: 1, max: 4000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, bio, githubUrl, portfolioUrl, skills, profileSections } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (bio !== undefined) data.bio = bio === '' ? null : bio;
      if (githubUrl !== undefined) data.githubUrl = githubUrl || null;
      if (portfolioUrl !== undefined) {
        data.portfolioUrl =
          portfolioUrl === null || portfolioUrl === '' ? null : String(portfolioUrl).trim() || null;
      }
      if (skills !== undefined) data.skills = skills;
      if (profileSections !== undefined) data.profileSections = normalizeProfileSections(profileSections);

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const user = await updateCurrentUserProfile(req.user.id, data);
      res.json(user);
    } catch (err) {
      sendRouteError(res, err, 'PATCH /api/users/me', 'Could not update profile');
    }
  },
);
