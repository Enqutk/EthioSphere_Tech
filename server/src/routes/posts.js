import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { parseGithubRepo, verifyPublicGithubRepo } from '../lib/githubPublic.js';
import { canViewProject } from '../lib/projectAccess.js';

export const postsRouter = Router();

// visibility + ownerId used only server-side for canViewProject; stripped before JSON
const postProjectSelect = {
  id: true,
  title: true,
  githubFullName: true,
  visibility: true,
  ownerId: true,
};

async function projectPayloadForViewer(prismaClient, project, viewerId) {
  if (!project) return null;
  const ok = await canViewProject(prismaClient, project, viewerId);
  if (!ok) return null;
  return { id: project.id, title: project.title, githubFullName: project.githubFullName };
}

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
      project: { select: postProjectSelect },
      _count: { select: { comments: true, votes: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const viewerId = req.user?.id;
  const withVoteCount = await Promise.all(
    posts.map(async (p) => {
      const project = await projectPayloadForViewer(prisma, p.project, viewerId);
      const { _count, project: _proj, ...rest } = p;
      return { ...rest, project, upvotes: _count.votes };
    }),
  );
  res.json(withVoteCount);
});

// Get one post with comments
postsRouter.get('/:id', optionalAuth, async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
      project: { select: postProjectSelect },
      comments: {
        include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { votes: true } },
    },
  });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const viewerId = req.user?.id;
  const project = await projectPayloadForViewer(prisma, post.project, viewerId);
  const { project: _p, ...rest } = post;
  res.json({ ...rest, project });
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
    body('projectId').optional({ values: 'falsy' }).isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, body, section = 'GENERAL' } = req.body;
    const rawProjectId = typeof req.body.projectId === 'string' ? req.body.projectId.trim() : '';
    const rawRepo = typeof req.body.repoUrl === 'string' ? req.body.repoUrl.trim() : '';

    let projectId = null;
    if (rawProjectId) {
      const proj = await prisma.project.findUnique({ where: { id: rawProjectId } });
      if (!proj) {
        return res.status(400).json({ error: 'Project not found', hint: 'Pick a project from the list or remove the link.' });
      }
      const allowed = await canViewProject(prisma, proj, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: 'You cannot link this project (not visible to you).' });
      }
      projectId = proj.id;
    }

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
        projectId,
        repoUrl,
        repoFullName,
        repoPublic,
        repoDescription,
      },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
        project: { select: postProjectSelect },
      },
    });
    const safeProject = await projectPayloadForViewer(prisma, post.project, req.user.id);
    const { project: _rp, ...rest } = post;
    res.status(201).json({ ...rest, project: safeProject });
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
