import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { isUniqueConstraintError } from '../lib/prismaErrors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { notifySubmissionLike, notifySubmissionComment } from '../services/notifications.js';
import { canUserCreateChallenge, challengeCreateRequirementText } from '../lib/challengeEligibility.js';
import {
  normalizeRequiredLanguages,
  languageMatchesRequirement,
  repoMatchesLanguageRequirements,
} from '../lib/challengeHelpers.js';
import { parseGithubRepo, verifyPublicGithubRepo, fetchRepoLanguages } from '../lib/githubPublic.js';

export const challengesRouter = Router();

function parseOptionalDate(v) {
  if (v == null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const createdBySelect = {
  id: true,
  username: true,
  name: true,
  accountType: true,
  company: { select: { legalName: true, verificationStatus: true } },
};

const submissionUserSelect = { id: true, name: true, username: true, avatarUrl: true };

async function enrichSubmissions(submissions, viewerId) {
  if (!submissions.length) return [];
  const ids = submissions.map((s) => s.id);
  const [commentGroups, viewerLikes] = await Promise.all([
    prisma.challengeSubmissionComment.groupBy({
      by: ['submissionId'],
      where: { submissionId: { in: ids } },
      _count: { _all: true },
    }),
    viewerId
      ? prisma.challengeSubmissionLike.findMany({
          where: { userId: viewerId, submissionId: { in: ids } },
          select: { submissionId: true },
        })
      : [],
  ]);
  const commentCountById = Object.fromEntries(commentGroups.map((g) => [g.submissionId, g._count._all]));
  const likedSet = new Set(viewerLikes.map((l) => l.submissionId));
  return submissions.map((s) => ({
    ...s,
    commentCount: commentCountById[s.id] ?? 0,
    likedByViewer: likedSet.has(s.id),
  }));
}

async function loadSubmissionsForChallenge(challenge, viewerId) {
  const now = new Date();
  const opensAt = challenge.submissionOpensAt ? new Date(challenge.submissionOpensAt) : null;
  const closesAt = challenge.submissionClosesAt ? new Date(challenge.submissionClosesAt) : null;
  const submissionsClosed = Boolean(closesAt && now > closesAt);

  let rows;
  if (!challenge.submissionClosesAt) {
    rows = await prisma.challengeSubmission.findMany({
      where: { challengeId: challenge.id },
      take: 50,
      orderBy: [{ likeCount: 'desc' }, { submittedAt: 'desc' }],
      include: { user: { select: submissionUserSelect } },
    });
  } else if (submissionsClosed) {
    rows = await prisma.challengeSubmission.findMany({
      where: { challengeId: challenge.id },
      orderBy: { submittedAt: 'asc' },
      include: { user: { select: submissionUserSelect } },
    });
  } else if (viewerId) {
    rows = await prisma.challengeSubmission.findMany({
      where: { challengeId: challenge.id, userId: viewerId },
      orderBy: { submittedAt: 'asc' },
      include: { user: { select: submissionUserSelect } },
    });
  } else {
    rows = [];
  }
  return enrichSubmissions(rows, viewerId);
}

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
      include: { createdBy: { select: createdBySelect } },
    });
    let canCreateChallenge = false;
    if (req.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, rank: true, isAdmin: true, accountType: true },
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

challengesRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: createdBySelect } },
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const now = new Date();
    const opensAt = challenge.submissionOpensAt ? new Date(challenge.submissionOpensAt) : null;
    const closesAt = challenge.submissionClosesAt ? new Date(challenge.submissionClosesAt) : null;
    const submissionsOpen = !opensAt || now >= opensAt;
    const submissionsClosed = Boolean(closesAt && now > closesAt);
    const acceptingSubmissions =
      challenge.active && submissionsOpen && !submissionsClosed && (!closesAt || now <= closesAt);

    const submissions = await loadSubmissionsForChallenge(challenge, req.user?.id);

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
    body('submissionMode').optional().isIn(['GITHUB', 'CODE']),
    body('requiredLanguages').optional().isArray(),
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
      const submissionMode = req.body.submissionMode === 'CODE' ? 'CODE' : 'GITHUB';
      const requiredLanguages = normalizeRequiredLanguages(req.body.requiredLanguages);
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
          submissionMode,
          requiredLanguages,
          createdById: req.user.id,
          ...(submissionOpensAt ? { submissionOpensAt } : {}),
          ...(submissionClosesAt ? { submissionClosesAt } : {}),
        },
        include: { createdBy: { select: createdBySelect } },
      });
      res.status(201).json(challenge);
    } catch (err) {
      sendRouteError(res, err, 'POST /api/challenges', 'Could not create challenge');
    }
  },
);

challengesRouter.post(
  '/:id/submit',
  requireAuth,
  [
    body('solutionUrl').optional({ values: 'falsy' }).isString().trim(),
    body('solutionText').optional({ values: 'falsy' }).isString().trim(),
    body('solutionLanguage').optional({ values: 'falsy' }).isString().trim(),
  ],
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

      const requiredLanguages = challenge.requiredLanguages ?? [];
      const mode = challenge.submissionMode || 'GITHUB';
      let solutionUrl = null;
      let solutionText = null;
      let solutionLanguage = null;
      let repoFullName = null;
      let repoPublic = null;
      let repoDescription = null;

      if (mode === 'CODE') {
        solutionText = typeof req.body.solutionText === 'string' ? req.body.solutionText.trim() : '';
        solutionLanguage = typeof req.body.solutionLanguage === 'string' ? req.body.solutionLanguage.trim() : '';
        if (!solutionText || solutionText.length < 3) {
          return res.status(400).json({ error: 'Paste your solution code for this challenge.' });
        }
        if (solutionText.length > 10000) {
          return res.status(400).json({ error: 'Solution code is too long (max 10,000 characters).' });
        }
        if (requiredLanguages.length && !languageMatchesRequirement(solutionLanguage, requiredLanguages)) {
          return res.status(400).json({
            error: `This challenge requires one of: ${requiredLanguages.join(', ')}`,
            hint: 'Select the language you used and ensure your code matches the requirement.',
          });
        }
      } else {
        let rawUrl = typeof req.body.solutionUrl === 'string' ? req.body.solutionUrl.trim() : '';
        if (!rawUrl) {
          return res.status(400).json({
            error: 'Submit a public GitHub repository URL with your solution.',
            hint: 'Push your code to GitHub and paste the repo link here.',
          });
        }
        if (!parseGithubRepo(rawUrl)) {
          return res.status(400).json({
            error: 'This challenge requires a public GitHub repository URL.',
            hint: 'Use https://github.com/yourname/your-solution-repo',
          });
        }
        const v = await verifyPublicGithubRepo(rawUrl);
        if (!v.ok) {
          return res.status(400).json({
            error: 'GitHub repository must exist and be public.',
            reason: v.reason,
          });
        }
        if (requiredLanguages.length) {
          const [owner, repo] = v.fullName.split('/');
          const langs = await fetchRepoLanguages(owner, repo);
          if (!repoMatchesLanguageRequirements(v.primaryLanguage, langs, requiredLanguages)) {
            return res.status(400).json({
              error: `Repository must use one of the required languages: ${requiredLanguages.join(', ')}`,
              detected: v.primaryLanguage || Object.keys(langs).join(', ') || 'unknown',
            });
          }
        }
        solutionUrl = v.htmlUrl;
        repoFullName = v.fullName;
        repoPublic = true;
        repoDescription = v.description;
        solutionLanguage = v.primaryLanguage || solutionLanguage;
      }

      const submission = await prisma.challengeSubmission.create({
        data: {
          challengeId: req.params.id,
          userId: req.user.id,
          solutionUrl,
          solutionText,
          solutionLanguage: solutionLanguage || null,
          repoFullName,
          repoPublic,
          repoDescription,
          points: challenge.rewardPoints,
        },
        include: { user: { select: submissionUserSelect }, challenge: { select: { title: true } } },
      });
      res.status(201).json({ ...submission, commentCount: 0, likedByViewer: false });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/challenges/:id/submit', 'Could not submit solution');
    }
  },
);

challengesRouter.post('/:challengeId/submissions/:submissionId/like', requireAuth, async (req, res) => {
  try {
    const submission = await prisma.challengeSubmission.findFirst({
      where: { id: req.params.submissionId, challengeId: req.params.challengeId },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const existing = await prisma.challengeSubmissionLike.findUnique({
      where: { submissionId_userId: { submissionId: submission.id, userId: req.user.id } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.challengeSubmissionLike.delete({ where: { id: existing.id } }),
        prisma.challengeSubmission.update({
          where: { id: submission.id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return res.json({ liked: false, likeCount: Math.max(0, submission.likeCount - 1) });
    }
    try {
      await prisma.$transaction([
        prisma.challengeSubmissionLike.create({
          data: { submissionId: submission.id, userId: req.user.id },
        }),
        prisma.challengeSubmission.update({
          where: { id: submission.id },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return res.json({ liked: true, likeCount: submission.likeCount });
      }
      throw err;
    }
    void notifySubmissionLike({
      authorId: submission.userId,
      actorId: req.user.id,
      actorName: req.user.name,
      challengeId: submission.challengeId,
      submissionId: submission.id,
    });
    res.json({ liked: true, likeCount: submission.likeCount + 1 });
  } catch (err) {
    sendRouteError(res, err, 'POST .../like', 'Could not update like');
  }
});

challengesRouter.get('/:challengeId/submissions/:submissionId/comments', optionalAuth, async (req, res) => {
  try {
    const submission = await prisma.challengeSubmission.findFirst({
      where: { id: req.params.submissionId, challengeId: req.params.challengeId },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    const comments = await prisma.challengeSubmissionComment.findMany({
      where: { submissionId: submission.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { user: { select: submissionUserSelect } },
    });
    res.json(comments);
  } catch (err) {
    sendRouteError(res, err, 'GET .../comments', 'Could not load comments');
  }
});

challengesRouter.post(
  '/:challengeId/submissions/:submissionId/comments',
  requireAuth,
  [body('body').trim().isLength({ min: 1, max: 2000 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const submission = await prisma.challengeSubmission.findFirst({
        where: { id: req.params.submissionId, challengeId: req.params.challengeId },
      });
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
      const comment = await prisma.challengeSubmissionComment.create({
        data: {
          submissionId: submission.id,
          userId: req.user.id,
          body: req.body.body.trim(),
        },
        include: { user: { select: submissionUserSelect } },
      });
      void notifySubmissionComment({
        authorId: submission.userId,
        actorId: req.user.id,
        actorName: req.user.name,
        challengeId: submission.challengeId,
        submissionId: submission.id,
        preview: comment.body,
      });
      res.status(201).json(comment);
    } catch (err) {
      sendRouteError(res, err, 'POST .../comments', 'Could not add comment');
    }
  },
);
