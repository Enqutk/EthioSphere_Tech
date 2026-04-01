import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import { parseGithubUserLogin, fetchGithubUser, inferRankFromGithub } from '../lib/githubPublic.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty(),
    body('username').trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: letters, numbers, underscore only'),
    body('githubUrl').optional({ values: 'falsy' }).isString().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password, name, username } = req.body;
      const rawGithub = typeof req.body.githubUrl === 'string' ? req.body.githubUrl.trim() : '';

      let rank = 'NEWBIE';
      let githubUrl = null;
      let avatarUrl = null;
      let githubNote = null;

      if (rawGithub) {
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
          rank,
          githubUrl,
          avatarUrl,
        },
        select: { id: true, email: true, username: true, name: true, rank: true, avatarUrl: true, githubUrl: true },
      });
      const token = signToken({ userId: user.id });
      res.status(201).json({ user, token, ...(githubNote && { githubNote }) });
    } catch (err) {
      console.error('POST /api/auth/register', err);
      const dev = process.env.NODE_ENV !== 'production';
      const hint =
        err.code === 'P1001'
          ? 'Cannot reach PostgreSQL. Check DATABASE_URL and that the database is running.'
          : err.code === 'P2021' || err.message?.includes('does not exist')
            ? 'Database tables missing. Run: cd server && npx prisma db push'
            : null;
      res.status(500).json({
        error: 'Registration failed',
        ...(dev && { details: err.message, code: err.code }),
        ...(hint && { hint }),
      });
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
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = signToken({ userId: user.id });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          rank: user.rank,
          avatarUrl: user.avatarUrl,
          githubUrl: user.githubUrl,
        },
        token,
      });
    } catch (err) {
      console.error('POST /api/auth/login', err);
      const dev = process.env.NODE_ENV !== 'production';
      res.status(500).json({
        error: 'Login failed',
        ...(dev && { details: err.message, code: err.code }),
      });
    }
  }
);
