import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { signToken } from '../middleware/auth.js';
import { parseGithubUserLogin, fetchGithubUser, inferRankFromGithub } from '../lib/githubPublic.js';
import { resolveActiveBan, banStatusPayload } from '../lib/banHelpers.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty(),
    body('username').trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: letters, numbers, underscore only'),
    body('accountType').optional().isIn(['developer', 'company']),
    body('githubUrl').optional({ values: 'falsy' }).isString().trim(),
    body('companyWebsite').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('companyDescription').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }),
    body('agreedToTerms').custom((v) => v === true || v === 'true').withMessage('You must accept the Privacy Policy and Terms of Service.'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password, name, username } = req.body;
      const accountType = req.body.accountType === 'company' ? 'COMPANY' : 'DEVELOPER';
      const rawGithub = typeof req.body.githubUrl === 'string' ? req.body.githubUrl.trim() : '';
      const companyWebsite = typeof req.body.companyWebsite === 'string' ? req.body.companyWebsite.trim() : '';
      const companyDescription =
        typeof req.body.companyDescription === 'string' ? req.body.companyDescription.trim() : '';

      if (accountType === 'COMPANY') {
        if (!companyWebsite) {
          return res.status(400).json({ error: 'Company website is required for company accounts.' });
        }
      }

      let rank = 'NEWBIE';
      let githubUrl = null;
      let avatarUrl = null;
      let githubNote = null;

      if (accountType === 'DEVELOPER' && rawGithub) {
        const login = parseGithubUserLogin(rawGithub);
        if (!login) {
          return res.status(400).json({
            error: 'Invalid GitHub profile',
            hint: 'Use your GitHub username, @name, or a profile URL like https://github.com/yourname',
          });
        }
        const gh = await fetchGithubUser(login);
        if (!gh.ok) {
          if (gh.status === 404) {
            return res.status(400).json({ error: 'GitHub user not found. Double-check the username or URL.' });
          }
          githubNote =
            gh.status === 403
              ? 'GitHub API rate limit — rank set to Newbie. Add your profile in settings later.'
              : 'Could not reach GitHub — rank set to Newbie. You can add your profile later.';
        } else {
          rank = inferRankFromGithub(gh.data);
          githubUrl = gh.data.html_url || `https://github.com/${login}`;
          avatarUrl = gh.data.avatar_url || null;
        }
      }

      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username: username.toLowerCase() }] },
      });
      if (existing) {
        return res.status(400).json({ error: 'Email or username already in use' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          username: username.toLowerCase(),
          rank: accountType === 'COMPANY' ? 'PRO_DEV' : rank,
          githubUrl: accountType === 'COMPANY' ? null : githubUrl,
          avatarUrl,
          accountType,
          termsAcceptedAt: new Date(),
          ...(accountType === 'COMPANY'
            ? {
                company: {
                  create: {
                    legalName: name.trim(),
                    website: companyWebsite,
                    description: companyDescription || null,
                    verificationStatus: 'PENDING',
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          rank: true,
          avatarUrl: true,
          githubUrl: true,
          isAdmin: true,
          accountType: true,
          company: {
            select: {
              id: true,
              legalName: true,
              website: true,
              verificationStatus: true,
            },
          },
        },
      });
      const token = signToken({ userId: user.id });
      res.status(201).json({ user, token, ...(githubNote && { githubNote }) });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/auth/register', 'Registration failed');
    }
  }
);

authRouter.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password } = req.body;
      // Explicit select so login still works if the DB is behind the schema (e.g. new columns not migrated yet).
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          rank: true,
          avatarUrl: true,
          githubUrl: true,
          isAdmin: true,
          accountType: true,
          isBanned: true,
          bannedAt: true,
          banExpiresAt: true,
          banReason: true,
          passwordHash: true,
          company: {
            select: {
              id: true,
              legalName: true,
              website: true,
              verificationStatus: true,
            },
          },
        },
      });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const pendingAppeal = await prisma.banAppeal.findFirst({
        where: { userId: user.id, status: 'PENDING' },
        select: { status: true },
      });
      const { user: activeUser, banned } = await resolveActiveBan({ ...user, pendingAppeal });
      if (banned) {
        return res.status(403).json(banStatusPayload({ ...activeUser, pendingAppeal }));
      }

      const token = signToken({ userId: activeUser.id });
      res.json({
        user: {
          id: activeUser.id,
          email: activeUser.email,
          username: activeUser.username,
          name: activeUser.name,
          rank: activeUser.rank,
          avatarUrl: activeUser.avatarUrl,
          githubUrl: activeUser.githubUrl,
          isAdmin: activeUser.isAdmin,
          accountType: activeUser.accountType,
          company: activeUser.company,
        },
        token,
      });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/auth/login', 'Login failed');
    }
  }
);

authRouter.post(
  '/ban-appeal',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('message').trim().isLength({ min: 20, max: 2000 }).withMessage('Please provide at least 20 characters explaining your appeal.'),
    body('explanation').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password, message } = req.body;
      const explanation = typeof req.body.explanation === 'string' ? req.body.explanation.trim() : null;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          passwordHash: true,
          isBanned: true,
          banExpiresAt: true,
          bannedAt: true,
          banReason: true,
        },
      });
      if (!user?.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const { banned } = await resolveActiveBan(user);
      if (!banned) {
        return res.status(400).json({ error: 'This account is not suspended. You may sign in normally.' });
      }

      const existing = await prisma.banAppeal.findFirst({
        where: { userId: user.id, status: 'PENDING' },
      });
      if (existing) {
        return res.status(409).json({
          error: 'You already have a pending appeal under review. Our team will respond by email.',
          code: 'APPEAL_PENDING',
        });
      }

      const appeal = await prisma.banAppeal.create({
        data: {
          userId: user.id,
          message: message.trim(),
          explanation: explanation || null,
        },
        select: { id: true, status: true, createdAt: true },
      });

      res.status(201).json({
        ok: true,
        message: 'Your appeal has been submitted. A member of our trust & safety team will review it shortly.',
        appeal,
      });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/auth/ban-appeal', 'Could not submit appeal');
    }
  }
);
