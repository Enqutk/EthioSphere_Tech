import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { canUserCreateChallenge, challengeCreateRequirementText } from '../lib/challengeEligibility.js';
import { parseGithubRepo, verifyPublicGithubRepo } from '../lib/githubPublic.js';

export const challengesRouter = Router();

function parseOptionalDate(v) {
  if (v == null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// List challenges
challengesRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const { difficulty, active } = req.query;
    const where = {};
    if (difficulty) where.difficulty = difficulty;
    if (active !== undefined) where.active = active === 'true';
    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    let canCreateChallenge = false;
    if (req.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, rank: true, isAdmin: true },
      });
      if (u) canCreateChallenge = await canUserCreateChallenge(u);
    }
    res.json({
      challenges,
      canCreateChallenge,
      createRequirement: challengeCreateRequirementText(),
    });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/challenges', 'Could not list challenges');
  }
});

const submissionUserSelect = { id: true, name: true, username: true, avatarUrl: true };

// Get one challenge (submissions filtered by deadline / privacy rules)
challengesRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const now = new Date();
    const opensAt = challenge.submissionOpensAt ? new Date(challenge.submissionOpensAt) : null;
    const closesAt = challenge.submissionClosesAt ? new Date(challenge.submissionClosesAt) : null;
    const submissionsOpen = !opensAt || now >= opensAt;
    const submissionsClosed = Boolean(closesAt && now > closesAt);
    const acceptingSubmissions =
      challenge.active && submissionsOpen && !submissionsClosed && (!closesAt || now <= closesAt);

    let submissions;
    if (!challenge.submissionClosesAt) {
      submissions = await prisma.challengeSubmission.findMany({
        where: { challengeId: challenge.id },
        take: 50,
        orderBy: { points: 'desc' },
        include: { user: { select: submissionUserSelect } },
      });
    } else if (submissionsClosed) {
      submissions = await prisma.challengeSubmission.findMany({
        where: { challengeId: challenge.id },
        orderBy: { submittedAt: 'asc' },
        include: { user: { select: submissionUserSelect } },
      });
    } else if (req.user?.id) {
      submissions = await prisma.challengeSubmission.findMany({
        where: { challengeId: challenge.id, userId: req.user.id },
        orderBy: { submittedAt: 'asc' },
        include: { user: { select: submissionUserSelect } },
      });
    } else {
      submissions = [];
    }

    res.json({
      ...challenge,
      submissions,
      timelineMeta: {
        submissionsOpen,
        submissionsClosed,
        acceptingSubmissions,
        hasDeadline: Boolean(challenge.submissionClosesAt),
        opensAt: challenge.submissionOpensAt,
        closesAt: challenge.submissionClosesAt,
      },
    });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/challenges/:id', 'Could not load challenge');
  }
});

// Submit solution (auth required)
challengesRouter.post(
  '/:id/submit',
  requireAuth,
  [body('solutionUrl').optional({ values: 'falsy' }).isString().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
      if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
      if (!challenge.active) return res.status(400).json({ error: 'Challenge is not active' });
      const now = new Date();
      if (challenge.submissionOpensAt && now < new Date(challenge.submissionOpensAt)) {
        return res.status(400).json({ error: 'Submissions are not open yet for this challenge.' });
      }
      if (challenge.submissionClosesAt && now > new Date(challenge.submissionClosesAt)) {
        return res.status(400).json({ error: 'The submission period for this challenge has ended.' });
      }
      const existing = await prisma.challengeSubmission.findFirst({
        where: { challengeId: req.params.id, userId: req.user.id },
      });
      if (existing) return res.status(400).json({ error: 'Already submitted for this challenge' });

      let solutionUrl = typeof req.body.solutionUrl === 'string' ? req.body.solutionUrl.trim() : '';
      let repoFullName = null;
      let repoPublic = null;
      let repoDescription = null;

      if (solutionUrl) {
        if (parseGithubRepo(solutionUrl)) {
          const v = await verifyPublicGithubRepo(solutionUrl);
          if (!v.ok) {
            return res.status(400).json({
              error: 'GitHub repository links must point to a public repo we can verify.',
              reason: v.reason,
            });
          }
          solutionUrl = v.htmlUrl;
          repoFullName = v.fullName;
          repoPublic = true;
          repoDescription = v.description;
        } else {
          try {
            const u = new URL(solutionUrl);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') {
              return res.status(400).json({ error: 'Invalid solution URL' });
            }
          } catch {
            return res.status(400).json({ error: 'Invalid solution URL' });
          }
        }
      } else {
        solutionUrl = null;
      }

      const points = challenge.rewardPoints;
      const submission = await prisma.challengeSubmission.create({
        data: {
          challengeId: req.params.id,
          userId: req.user.id,
          solutionUrl,
          repoFullName,
          repoPublic,
          repoDescription,
          points,
        },
        include: { user: { select: { id: true, name: true, username: true } }, challenge: { select: { title: true } } },
      });
      res.status(201).json(submission);
    } catch (err) {
      sendRouteError(res, err, 'POST /api/challenges/:id/submit', 'Could not submit solution');
    }
  }
);

// Create challenge (eligible devs: admin, Junior+ rank, or Newbie with enough completions)
challengesRouter.post(
  '/',
  requireAuth,
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('difficulty').isIn(['EASY', 'MEDIUM', 'HARD']),
    body('rewardPoints').optional().isInt({ min: 0 }),
    body('submissionOpensAt').optional({ values: 'falsy' }).isISO8601(),
    body('submissionClosesAt').optional({ values: 'falsy' }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const ok = await canUserCreateChallenge(req.user);
      if (!ok) {
        return res.status(403).json({
          error: 'You are not eligible to create challenges yet.',
          hint: challengeCreateRequirementText(),
        });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { title, description, difficulty, rewardPoints = 10 } = req.body;
      const submissionOpensAt = parseOptionalDate(req.body.submissionOpensAt);
      const submissionClosesAt = parseOptionalDate(req.body.submissionClosesAt);
      if (submissionOpensAt && submissionClosesAt && submissionOpensAt >= submissionClosesAt) {
        return res.status(400).json({ error: 'submissionOpensAt must be before submissionClosesAt' });
      }
      const challenge = await prisma.challenge.create({
        data: {
          title,
          description,
          difficulty,
          rewardPoints,
          ...(submissionOpensAt ? { submissionOpensAt } : {}),
          ...(submissionClosesAt ? { submissionClosesAt } : {}),
        },
      });
      res.status(201).json(challenge);
    } catch (err) {
      sendRouteError(res, err, 'POST /api/challenges', 'Could not create challenge');
    }
  }
);
