import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { parseListPagination } from '../lib/pagination.js';
import { postPulseScore } from '../lib/pulseScore.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { parseGithubRepo, verifyPublicGithubRepo } from '../lib/githubPublic.js';
import { canViewProject } from '../lib/projectAccess.js';
import {
  getPostProjectSelect,
  listPostsForViewer,
  getPostDetailForViewer,
  projectPayloadForViewer,
  postVoteTalliesForIds,
  shapePostListItem,
} from '../services/postsService.js';

export const postsRouter = Router();
const postProjectSelect = getPostProjectSelect();

postsRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const { take, skip } = parseListPagination(req.query);
    const page = await listPostsForViewer({
      section: req.query.section,
      search: req.query.search,
      viewerId: req.user?.id,
      take,
      skip,
    });
    res.json(page);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/posts', 'Could not list posts');
  }
});

postsRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const out = await getPostDetailForViewer(req.params.id, req.user?.id);
    if (!out) return res.status(404).json({ error: 'Post not found' });
    res.json(out);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/posts/:id', 'Could not load post');
  }
});

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
      const safeProject = await projectPayloadForViewer(post.project, req.user.id);
      const tallies = await postVoteTalliesForIds([post.id]);
      const shaped = shapePostListItem(post, tallies, new Map(), safeProject);
      res.status(201).json(shaped);
    } catch (err) {
      sendRouteError(res, err, 'POST /api/posts', 'Could not create post');
    }
  },
);

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
      sendRouteError(res, err, 'POST /api/posts/:id/comments', 'Could not add comment');
    }
  },
);

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
    sendRouteError(res, err, 'POST /api/posts/:id/vote', 'Could not record vote');
  }
});
