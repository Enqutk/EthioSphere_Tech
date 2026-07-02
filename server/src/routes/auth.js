import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { signToken } from '../middleware/auth.js';
import { parseGithubUserLogin, fetchGithubUser, inferRankFromGithub } from '../lib/githubPublic.js';
import { resolveActiveBan, banStatusPayload } from '../lib/banHelpers.js';
import { parsePrimaryDiscipline } from '../lib/disciplines.js';
import { parseGender, parseDateOfBirth } from '../lib/demographics.js';
import { getClientOrigin } from '../config/index.js';
import {
  isGoogleOAuthConfigured,
  buildGoogleAuthUrl,
  createOAuthState,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  suggestUniqueUsername,
} from '../lib/googleOAuth.js';

export const authRouter = Router();

function signedOAuthState(extra = {}) {
  const payload = { ts: Date.now(), nonce: createOAuthState(), ...extra };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySignedOAuthState(state) {
  if (!state || typeof state !== 'string') return null;
  const dot = state.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!data.ts || Date.now() - data.ts > 15 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function authUserSelect() {
  return {
    id: true,
    email: true,
    username: true,
    name: true,
    rank: true,
    avatarUrl: true,
    githubUrl: true,
    isAdmin: true,
    accountType: true,
    primaryDiscipline: true,
    googleId: true,
    passwordHash: true,
    company: {
      select: {
        id: true,
        legalName: true,
        website: true,
        verificationStatus: true,
      },
    },
  };
}

function publicAuthUser(user) {
  const { passwordHash, googleId, ...rest } = user;
  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
    googleLinked: Boolean(googleId),
  };
}

authRouter.get('/google', (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
  }
  const state = signedOAuthState({ from: typeof req.query.from === 'string' ? req.query.from.slice(0, 200) : '/' });
  res.redirect(buildGoogleAuthUrl(state));
});

authRouter.get('/google/callback', async (req, res) => {
  const clientOrigin = getClientOrigin();
  const fail = (message) => {
    res.redirect(`${clientOrigin}/auth/callback?error=${encodeURIComponent(message)}`);
  };

  try {
    if (!isGoogleOAuthConfigured()) return fail('Google sign-in is not configured.');
    const { code, state, error } = req.query;
    if (error) return fail(String(error));
    if (!code || typeof code !== 'string') return fail('Missing authorization code.');
    if (!state || typeof state !== 'string') return fail('Invalid sign-in state.');
    const stateData = verifySignedOAuthState(state);
    if (!stateData) return fail('Invalid or expired sign-in session.');

    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserInfo(tokens.access_token);
    const email = String(profile.email).toLowerCase();
    const googleId = String(profile.id);

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      select: {
        ...authUserSelect(),
        isBanned: true,
        bannedAt: true,
        banExpiresAt: true,
        banReason: true,
      },
    });

    if (user && !user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: user.avatarUrl || profile.picture || null },
        select: { ...authUserSelect(), isBanned: true, bannedAt: true, banExpiresAt: true, banReason: true },
      });
    }

    if (!user) {
      const username = await suggestUniqueUsername(prisma, email, profile.name);
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          name: (profile.name || username).slice(0, 80),
          username,
          avatarUrl: profile.picture || null,
          accountType: 'DEVELOPER',
          primaryDiscipline: 'DEVELOPER',
          termsAcceptedAt: new Date(),
        },
        select: { ...authUserSelect(), isBanned: true, bannedAt: true, banExpiresAt: true, banReason: true },
      });
    }

    const pendingAppeal = await prisma.banAppeal.findFirst({
      where: { userId: user.id, status: 'PENDING' },
      select: { status: true },
    });
    const { user: activeUser, banned } = await resolveActiveBan({ ...user, pendingAppeal });
    if (banned) {
      const payload = banStatusPayload({ ...activeUser, pendingAppeal });
      return fail(String(payload.error || 'Account suspended'));
    }

    const token = signToken({ userId: activeUser.id });
    const redirectTo =
      typeof stateData.from === 'string' && stateData.from.startsWith('/') ? stateData.from : '/';
    res.redirect(`${clientOrigin}/auth/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectTo)}`);
  } catch (err) {
    console.error('GET /api/auth/google/callback', err);
    fail(err.message || 'Google sign-in failed');
  }
});

authRouter.get('/google/status', (req, res) => {
  res.json({ enabled: isGoogleOAuthConfigured() });
});

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
    body('primaryDiscipline').optional().isString().trim(),
    body('dateOfBirth').isISO8601().withMessage('Date of birth is required (YYYY-MM-DD).'),
    body('gender').isString().trim().notEmpty().withMessage('Please select a gender option.'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password, name, username } = req.body;
      const accountType = req.body.accountType === 'company' ? 'COMPANY' : 'DEVELOPER';
      const primaryDiscipline =
        accountType === 'COMPANY' ? 'DEVELOPER' : parsePrimaryDiscipline(req.body.primaryDiscipline);
      const rawGithub = typeof req.body.githubUrl === 'string' ? req.body.githubUrl.trim() : '';
      const companyWebsite = typeof req.body.companyWebsite === 'string' ? req.body.companyWebsite.trim() : '';
      const companyDescription =
        typeof req.body.companyDescription === 'string' ? req.body.companyDescription.trim() : '';

      const gender = parseGender(req.body.gender);
      if (!gender) {
        return res.status(400).json({ error: 'Please select a valid gender option.' });
      }

      let dateOfBirth;
      try {
        dateOfBirth = parseDateOfBirth(req.body.dateOfBirth);
      } catch (dobErr) {
        return res.status(dobErr.status || 400).json({ error: dobErr.message });
      }

      if (accountType === 'COMPANY') {
        if (!companyWebsite) {
          return res.status(400).json({ error: 'Company website is required for company accounts.' });
        }
      }

      let rank = 'NEWBIE';
      let githubUrl = null;
      let avatarUrl = null;
      let githubNote = null;

      if (accountType === 'DEVELOPER' && primaryDiscipline === 'DEVELOPER' && rawGithub) {
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
          primaryDiscipline,
          dateOfBirth,
          gender,
          termsAcceptedAt: new Date(),
          ...(accountType === 'COMPANY'
            ? {
                company: {
                  create: {
                    legalName: name.trim(),
                    website: companyWebsite,
                    description: companyDescription || null,
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
          primaryDiscipline: true,
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
      res.status(201).json({
        user: { ...user, hasPassword: true, googleLinked: false },
        token,
        ...(githubNote && { githubNote }),
      });
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
          primaryDiscipline: true,
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
        user: publicAuthUser(activeUser),
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
