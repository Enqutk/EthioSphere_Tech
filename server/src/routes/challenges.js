import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export const challengesRouter = Router();

// List challenges
challengesRouter.get('/', optionalAuth, async (req, res) => {
  const { difficulty, active } = req.query;
  const where = {};
  if (difficulty) where.difficulty = difficulty;
  if (active !== undefined) where.active = active === 'true';
  const challenges = await prisma.challenge.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(challenges);
});

// Get one challenge
challengesRouter.get('/:id', optionalAuth, async (req, res) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: req.params.id },
    include: {
      submissions: {
        take: 10,
        orderBy: { points: 'desc' },
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      },
    },
  });
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  res.json(challenge);
});

// Submit solution (auth required)
challengesRouter.post(
  '/:id/submit',
  requireAuth,
  [body('solutionUrl').optional().trim().isURL()],
  async (req, res) => {
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (!challenge.active) return res.status(400).json({ error: 'Challenge is not active' });
    const existing = await prisma.challengeSubmission.findFirst({
      where: { challengeId: req.params.id, userId: req.user.id },
    });
    if (existing) return res.status(400).json({ error: 'Already submitted for this challenge' });
    const solutionUrl = req.body.solutionUrl || null;
    const points = challenge.rewardPoints;
    const submission = await prisma.challengeSubmission.create({
      data: {
        challengeId: req.params.id,
        userId: req.user.id,
        solutionUrl,
        points,
      },
      include: { user: { select: { id: true, name: true, username: true } }, challenge: { select: { title: true } } },
    });
    res.status(201).json(submission);
  }
);

// Create challenge (admin - for MVP we allow any authenticated user; later add role check)
challengesRouter.post(
  '/',
  requireAuth,
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('difficulty').isIn(['EASY', 'MEDIUM', 'HARD']),
    body('rewardPoints').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, description, difficulty, rewardPoints = 10 } = req.body;
    const challenge = await prisma.challenge.create({
      data: { title, description, difficulty, rewardPoints },
    });
    res.status(201).json(challenge);
  }
);
