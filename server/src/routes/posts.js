import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { parseGithubRepo, verifyPublicGithubRepo } from '../lib/githubPublic.js';

export const postsRouter = Router();

// List posts (community)
postsRouter.get('/', optionalAuth, async (req, res) => {
  const { section, search } = req.query;
  const where = {};
  if (section) where.section = section;
  if (search && String(search).trim()) {
    where.OR = [
      { title: { contains: String(search).trim(), mode: 'insensitive' } },
      { body: { contains: String(search).trim(), mode: 'insensitive' } },
    ];
  }
  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
      _count: { select: { comments: true, votes: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const withVoteCount = posts.map((p) => ({
    ...p,
    upvotes: p._count.votes, // simplified: we could sum upvote vs downvote in a real impl
  }));
  res.json(withVoteCount);
});

// Get one post with comments
postsRouter.get('/:id', optionalAuth, async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
      comments: {
        include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { votes: true } },
    },
  });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// Create post (auth required)
postsRouter.post(
  '/',
  requireAuth,
  [
    body('title').trim().notEmpty().isLength({ max: 300 }),
    body('body').trim().notEmpty(),
    body('section').optional().isIn(['GENERAL', 'DEBUG_HELP', 'PROJECT_FEEDBACK', 'ANNOUNCEMENTS', 'REACT', 'NODE', 'PYTHON', 'OTHER']),
    body('repoUrl').optional({ values: 'falsy' }).isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, body, section = 'GENERAL' } = req.body;
    const rawRepo = typeof req.body.repoUrl === 'string' ? req.body.repoUrl.trim() : '';

    let repoUrl = null;
    let repoFullName = null;
    let repoPublic = null;
    let repoDescription = null;

    if (rawRepo) {
      if (!parseGithubRepo(rawRepo)) {
        return res.status(400).json({
          error: 'Repository link must be a public GitHub repo URL',
          hint: 'Example: https://github.com/facebook/react',
        });
      }
      const v = await verifyPublicGithubRepo(rawRepo);
      if (!v.ok) {
        return res.status(400).json({
          error: 'We can only show repositories that exist on GitHub and are public.',
          reason: v.reason,
        });
      }
      repoUrl = v.htmlUrl;
      repoFullName = v.fullName;
      repoPublic = true;
      repoDescription = v.description;
    }

    const post = await prisma.post.create({
      data: {
        title,
        body,
        section,
        authorId: req.user.id,
        repoUrl,
        repoFullName,
        repoPublic,
        repoDescription,
      },
      include: { author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } } },
    });
    res.status(201).json(post);
  }
);

// Add comment
postsRouter.post(
  '/:id/comments',
  requireAuth,
  [body('body').trim().notEmpty(), body('parentId').optional().isString(), body('isSolution').optional().isBoolean()],
  async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const comment = await prisma.comment.create({
      data: {
        postId: req.params.id,
        authorId: req.user.id,
        body: req.body.body,
        parentId: req.body.parentId || null,
        isSolution: req.body.isSolution || false,
      },
      include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    });
    if (req.body.isSolution) {
      await prisma.post.update({ where: { id: req.params.id }, data: { solved: true } });
    }
    res.status(201).json(comment);
  }
);

// Upvote/downvote (auth required)
postsRouter.post('/:id/vote', requireAuth, [body('upvote').isBoolean()], async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const upvote = req.body.upvote === true;
  await prisma.postVote.upsert({
    where: { postId_userId: { postId: req.params.id, userId: req.user.id } },
    create: { postId: req.params.id, userId: req.user.id, upvote },
    update: { upvote },
  });
  res.json({ message: 'Vote recorded' });
});
