import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { extrasForPrismaError } from '../lib/dbErrors.js';
import { postPulseScore } from '../lib/pulseScore.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { parseGithubRepo, verifyPublicGithubRepo } from '../lib/githubPublic.js';
import { canViewProject } from '../lib/projectAccess.js';

export const postsRouter = Router();

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

/** @returns {Promise<Map<string, { up: number, down: number }>>} */
async function postVoteTalliesForIds(postIds) {
  const map = new Map();
  for (const id of postIds) map.set(id, { up: 0, down: 0 });
  if (!postIds.length) return map;
  const rows = await prisma.postVote.groupBy({
    by: ['postId', 'upvote'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  for (const r of rows) {
    const cur = map.get(r.postId);
    if (!cur) continue;
    if (r.upvote) cur.up = r._count._all;
    else cur.down = r._count._all;
  }
  return map;
}

async function viewerVotesForPosts(viewerId, postIds) {
  const map = new Map();
  if (!viewerId || !postIds.length) return map;
  const rows = await prisma.postVote.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true, upvote: true },
  });
  for (const r of rows) map.set(r.postId, r.upvote);
  return map;
}

function shapePostListItem(p, tallies, viewerVoteMap, project) {
  const { _count, project: _proj, ...rest } = p;
  const t = tallies.get(p.id) || { up: 0, down: 0 };
  const commentCount = _count.comments;
  const pulseScore = postPulseScore({
    upvotes: t.up,
    downvotes: t.down,
    viewCount: p.viewCount,
    commentCount,
  });
  const viewerVote = viewerVoteMap.has(p.id) ? (viewerVoteMap.get(p.id) ? 'up' : 'down') : null;
  return {
    ...rest,
    project,
    upvotes: t.up,
    downvotes: t.down,
    pulseScore,
    commentCount,
    viewerVote,
  };
}

// List posts (community)
postsRouter.get('/', optionalAuth, async (req, res) => {
  try {
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
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const viewerId = req.user?.id;
    const ids = posts.map((p) => p.id);
    const [tallies, viewerVoteMap] = await Promise.all([
      postVoteTalliesForIds(ids),
      viewerVotesForPosts(viewerId, ids),
    ]);
    const shaped = await Promise.all(
      posts.map(async (p) => {
        const project = await projectPayloadForViewer(prisma, p.project, viewerId);
        return shapePostListItem(p, tallies, viewerVoteMap, project);
      }),
    );
    res.json(shaped);
  } catch (err) {
    console.error('GET /api/posts', err);
    const dev = process.env.NODE_ENV !== 'production';
    const { hint, prismaCode } = extrasForPrismaError(err);
    res.status(500).json({
      error: 'Could not list posts',
      ...(dev && { details: String(err?.message ?? err), code: prismaCode }),
      ...(hint && { hint }),
    });
  }
});

// Get one post with comments (+ view increment)
postsRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
        project: { select: postProjectSelect },
        comments: {
          include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    await prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
    const viewCount = post.viewCount + 1;
    const viewerId = req.user?.id;
    const project = await projectPayloadForViewer(prisma, post.project, viewerId);
    const tallies = await postVoteTalliesForIds([post.id]);
    const t = tallies.get(post.id) || { up: 0, down: 0 };
    const commentCount = post._count.comments;
    const pulseScore = postPulseScore({
      upvotes: t.up,
      downvotes: t.down,
      viewCount,
      commentCount,
    });
    let viewerVote = null;
    if (viewerId) {
      const v = await prisma.postVote.findUnique({
        where: { postId_userId: { postId: post.id, userId: viewerId } },
      });
      if (v) viewerVote = v.upvote ? 'up' : 'down';
    }
    const { project: _p, _count, ...rest } = post;
    res.json({
      ...rest,
      viewCount,
      project,
      upvotes: t.up,
      downvotes: t.down,
      pulseScore,
      commentCount,
      viewerVote,
    });
  } catch (err) {
    console.error('GET /api/posts/:id', err);
    const dev = process.env.NODE_ENV !== 'production';
    const { hint, prismaCode } = extrasForPrismaError(err);
    res.status(500).json({
      error: 'Could not load post',
      ...(dev && { details: String(err?.message ?? err), code: prismaCode }),
      ...(hint && { hint }),
    });
  }
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
    try {
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
          _count: { select: { comments: true } },
        },
      });
      const safeProject = await projectPayloadForViewer(prisma, post.project, req.user.id);
      const tallies = await postVoteTalliesForIds([post.id]);
      const shaped = shapePostListItem(post, tallies, new Map(), safeProject);
      res.status(201).json(shaped);
    } catch (err) {
      console.error('POST /api/posts', err);
      const dev = process.env.NODE_ENV !== 'production';
      const { hint, prismaCode } = extrasForPrismaError(err);
      res.status(500).json({
        error: 'Could not create post',
        ...(dev && { details: String(err?.message ?? err), code: prismaCode }),
        ...(hint && { hint }),
      });
    }
  },
);

// Add comment
postsRouter.post(
  '/:id/comments',
  requireAuth,
  [body('body').trim().notEmpty(), body('parentId').optional().isString(), body('isSolution').optional().isBoolean()],
  async (req, res) => {
    try {
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
    } catch (err) {
      console.error('POST /api/posts/:id/comments', err);
      const dev = process.env.NODE_ENV !== 'production';
      const { hint, prismaCode } = extrasForPrismaError(err);
      res.status(500).json({
        error: 'Could not add comment',
        ...(dev && { details: String(err?.message ?? err), code: prismaCode }),
        ...(hint && { hint }),
      });
    }
  },
);

// Upvote/downvote (auth required)
postsRouter.post('/:id/vote', requireAuth, [body('upvote').isBoolean()], async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { comments: true } } },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const upvote = req.body.upvote === true;
    await prisma.postVote.upsert({
      where: { postId_userId: { postId: req.params.id, userId: req.user.id } },
      create: { postId: req.params.id, userId: req.user.id, upvote },
      update: { upvote },
    });
    const tallies = await postVoteTalliesForIds([post.id]);
    const t = tallies.get(post.id) || { up: 0, down: 0 };
    const commentCount = post._count.comments;
    const pulseScore = postPulseScore({
      upvotes: t.up,
      downvotes: t.down,
      viewCount: post.viewCount,
      commentCount,
    });
    res.json({
      upvotes: t.up,
      downvotes: t.down,
      pulseScore,
      viewerVote: upvote ? 'up' : 'down',
    });
  } catch (err) {
    console.error('POST /api/posts/:id/vote', err);
    const dev = process.env.NODE_ENV !== 'production';
    const { hint, prismaCode } = extrasForPrismaError(err);
    res.status(500).json({
      error: 'Could not record vote',
      ...(dev && { details: String(err?.message ?? err), code: prismaCode }),
      ...(hint && { hint }),
    });
  }
});
