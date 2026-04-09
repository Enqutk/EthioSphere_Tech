import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  parseGithubRepo,
  verifyPublicGithubRepo,
  buildPublicRepoBundle,
} from '../lib/githubPublic.js';
import { projectListVisibilityWhere, canViewProject } from '../lib/projectAccess.js';
import { projectPulseScore } from '../lib/pulseScore.js';

export const projectsRouter = Router();

const GITHUB_SYNC_MS = 10 * 60 * 1000;

/** Avoid duplicate GitHub bundle fetches when many clients hit a stale project at once. */
const githubRefreshInFlight = new Set();

const projectInclude = {
  owner: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
  members: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
};

const projectIncludeList = {
  owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
  members: { select: { role: true, user: { select: { id: true, name: true, username: true } } } },
};

function omitReadmeFromGithubData(githubData) {
  if (!githubData || typeof githubData !== 'object' || Array.isArray(githubData)) return githubData;
  const { readme: _r, ...rest } = githubData;
  return rest;
}

function repoStarsFromGithubData(gh) {
  if (!gh || typeof gh !== 'object' || !gh.repo || typeof gh.repo !== 'object') return 0;
  return Number(gh.repo.stargazers_count) || 0;
}

// List projects (with optional filters)
projectsRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const viewerId = req.user?.id;
    const { status, type, search } = req.query;
    const filters = [projectListVisibilityWhere(viewerId)];
    if (status) filters.push({ status });
    if (type) filters.push({ type });
    if (search && String(search).trim()) {
      const s = String(search).trim();
      filters.push({
        OR: [
          { title: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
          { githubFullName: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    const where = filters.length === 1 ? filters[0] : { AND: filters };
    const projects = await prisma.project.findMany({
      where,
      include: projectIncludeList,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    let likedIds = new Set();
    if (viewerId && projects.length) {
      const likes = await prisma.projectLike.findMany({
        where: { userId: viewerId, projectId: { in: projects.map((x) => x.id) } },
        select: { projectId: true },
      });
      likedIds = new Set(likes.map((l) => l.projectId));
    }
    res.json(
      projects.map((p) => {
        const gh = p.githubData ? omitReadmeFromGithubData(p.githubData) : p.githubData;
        const memberCount = 1 + (p.members?.length || 0);
        const pulseScore = projectPulseScore({
          likeCount: p.likeCount,
          viewCount: p.viewCount,
          memberCount,
          repoStars: repoStarsFromGithubData(gh),
        });
        return {
          ...p,
          githubData: gh,
          pulseScore,
          likedByViewer: viewerId ? likedIds.has(p.id) : false,
        };
      }),
    );
  } catch (err) {
    console.error('GET /api/projects', err);
    res.status(500).json({ error: 'Could not list projects' });
  }
});

// Get one project (refreshes GitHub snapshot when stale)
projectsRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    let project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: projectInclude,
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const viewerId = req.user?.id;
    const allowed = await canViewProject(prisma, project, viewerId);
    if (!allowed) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.githubFullName) {
      const synced = project.githubSyncedAt ? new Date(project.githubSyncedAt).getTime() : 0;
      const stale = !project.githubSyncedAt || Date.now() - synced > GITHUB_SYNC_MS;
      if (stale) {
        const slash = project.githubFullName.indexOf('/');
        if (slash > 0) {
          const owner = project.githubFullName.slice(0, slash);
          const repo = project.githubFullName.slice(slash + 1);
          const pid = project.id;
          if (!githubRefreshInFlight.has(pid)) {
            githubRefreshInFlight.add(pid);
            res.setHeader('X-Github-Refresh', 'scheduled');
            void (async () => {
              try {
                const bundle = await buildPublicRepoBundle(owner, repo);
                if (bundle.ok) {
                  await prisma.project.update({
                    where: { id: pid },
                    data: {
                      githubData: bundle.payload,
                      githubSyncedAt: new Date(),
                      githubHtmlUrl: bundle.apiRepo.html_url,
                    },
                  });
                }
              } catch (e) {
                console.error('Background GitHub refresh failed', pid, e);
              } finally {
                githubRefreshInFlight.delete(pid);
              }
            })();
          }
        }
      }
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { viewCount: { increment: 1 } },
    });
    const viewCount = project.viewCount + 1;
    let likedByViewer = false;
    if (viewerId) {
      likedByViewer = Boolean(
        await prisma.projectLike.findUnique({
          where: { projectId_userId: { projectId: project.id, userId: viewerId } },
        }),
      );
    }
    const ghOut = project.githubData ? omitReadmeFromGithubData(project.githubData) : project.githubData;
    const memberCount = 1 + (project.members?.length || 0);
    const pulseScore = projectPulseScore({
      likeCount: project.likeCount,
      viewCount,
      memberCount,
      repoStars: repoStarsFromGithubData(ghOut),
    });
    res.json({ ...project, githubData: ghOut, viewCount, pulseScore, likedByViewer });
  } catch (err) {
    console.error('GET /api/projects/:id', err);
    res.status(500).json({ error: 'Could not load project' });
  }
});

// Like / unlike project (auth, must be able to view project)
projectsRouter.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const allowed = await canViewProject(prisma, project, req.user.id);
    if (!allowed) return res.status(404).json({ error: 'Project not found' });
    const existing = await prisma.projectLike.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: req.user.id } },
    });
    const extraMembers = await prisma.projectMember.count({ where: { projectId: project.id } });
    const memberCount = 1 + extraMembers;
    const gh = project.githubData ? omitReadmeFromGithubData(project.githubData) : project.githubData;

    if (existing) {
      await prisma.$transaction([
        prisma.projectLike.delete({ where: { id: existing.id } }),
        prisma.project.update({
          where: { id: project.id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      const likeCount = Math.max(0, project.likeCount - 1);
      const pulseScore = projectPulseScore({
        likeCount,
        viewCount: project.viewCount,
        memberCount,
        repoStars: repoStarsFromGithubData(gh),
      });
      return res.json({ liked: false, likeCount, pulseScore });
    }
    await prisma.$transaction([
      prisma.projectLike.create({
        data: { projectId: project.id, userId: req.user.id },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    const likeCount = project.likeCount + 1;
    const pulseScore = projectPulseScore({
      likeCount,
      viewCount: project.viewCount,
      memberCount,
      repoStars: repoStarsFromGithubData(gh),
    });
    return res.json({ liked: true, likeCount, pulseScore });
  } catch (err) {
    console.error('POST /api/projects/:id/like', err);
    res.status(500).json({ error: 'Could not update like' });
  }
});

// Create project (auth required) — GitHub public repo URL required
projectsRouter.post(
  '/',
  requireAuth,
  [
    body('githubRepoUrl').trim().notEmpty().withMessage('GitHub repository URL is required'),
    body('title').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim(),
    body('type').optional().isIn(['OPEN_SOURCE', 'HACKATHON', 'LEARNING']),
    body('visibility').optional().isIn(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']),
    body('seekingReview').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const rawGithub = String(req.body.githubRepoUrl).trim();
      if (!parseGithubRepo(rawGithub)) {
        return res.status(400).json({
          error: 'Invalid GitHub repository URL',
          hint: 'Use https://github.com/owner/repository',
        });
      }
      const verified = await verifyPublicGithubRepo(rawGithub);
      if (!verified.ok) {
        return res.status(400).json({
          error: 'Repository must exist on GitHub and be public.',
          reason: verified.reason,
        });
      }

      const { owner, repo } = parseGithubRepo(rawGithub);
      const bundle = await buildPublicRepoBundle(owner, repo);
      if (!bundle.ok) {
        return res.status(502).json({
          error: 'Could not load repository data from GitHub',
          ...(bundle.message && { details: bundle.message }),
        });
      }

      const apiRepo = bundle.apiRepo;
      const title =
        (req.body.title && String(req.body.title).trim()) || apiRepo.name || apiRepo.full_name;
      const description =
        (req.body.description != null && String(req.body.description).trim()) ||
        (apiRepo.description && String(apiRepo.description).trim()) ||
        'No description on GitHub.';

      const visibility = ['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'].includes(req.body.visibility)
        ? req.body.visibility
        : 'PUBLIC';
      const seekingReview = Boolean(req.body.seekingReview);

      const project = await prisma.project.create({
        data: {
          title: title.slice(0, 200),
          description,
          type: req.body.type || 'LEARNING',
          visibility,
          seekingReview,
          ownerId: req.user.id,
          githubHtmlUrl: apiRepo.html_url,
          githubFullName: apiRepo.full_name,
          githubData: bundle.payload,
          githubSyncedAt: new Date(),
        },
        include: { owner: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      });
      res.status(201).json(project);
    } catch (err) {
      console.error('POST /api/projects', err);
      const dev = process.env.NODE_ENV !== 'production';
      res.status(500).json({
        error: 'Could not create project',
        ...(dev && { details: err.message }),
      });
    }
  },
);

// Update project (owner only)
projectsRouter.patch(
  '/:id',
  requireAuth,
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().notEmpty(),
    body('status').optional().isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']),
    body('type').optional().isIn(['OPEN_SOURCE', 'HACKATHON', 'LEARNING']),
    body('githubRepoUrl').optional({ values: 'falsy' }).isString().trim(),
    body('visibility').optional().isIn(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']),
    body('seekingReview').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only the owner can update this project' });
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, description, status, type, visibility, seekingReview } = req.body;
      const data = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (status !== undefined) data.status = status;
      if (type !== undefined) data.type = type;
      if (visibility !== undefined) data.visibility = visibility;
      if (seekingReview !== undefined) data.seekingReview = Boolean(seekingReview);

      const rawGithub = typeof req.body.githubRepoUrl === 'string' ? req.body.githubRepoUrl.trim() : '';
      if (rawGithub) {
        if (!parseGithubRepo(rawGithub)) {
          return res.status(400).json({
            error: 'Invalid GitHub repository URL',
            hint: 'Use https://github.com/owner/repository',
          });
        }
        const verified = await verifyPublicGithubRepo(rawGithub);
        if (!verified.ok) {
          return res.status(400).json({
            error: 'Repository must exist on GitHub and be public.',
            reason: verified.reason,
          });
        }
        const { owner, repo } = parseGithubRepo(rawGithub);
        const bundle = await buildPublicRepoBundle(owner, repo);
        if (!bundle.ok) {
          return res.status(502).json({
            error: 'Could not load repository data from GitHub',
            ...(bundle.message && { details: bundle.message }),
          });
        }
        data.githubHtmlUrl = bundle.apiRepo.html_url;
        data.githubFullName = bundle.apiRepo.full_name;
        data.githubData = bundle.payload;
        data.githubSyncedAt = new Date();
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data,
        include: projectInclude,
      });
      res.json(updated);
    } catch (err) {
      console.error('PATCH /api/projects/:id', err);
      res.status(500).json({ error: 'Could not update project' });
    }
  },
);

// Join project (auth required)
projectsRouter.post('/:id/join', requireAuth, [body('role').trim().notEmpty()], async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const allowed = await canViewProject(prisma, project, req.user.id);
  if (!allowed) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId === req.user.id) return res.status(400).json({ error: 'Owner is already a member' });
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.params.id, userId: req.user.id } },
  });
  if (existing) return res.status(400).json({ error: 'Already a member' });
  const member = await prisma.projectMember.create({
    data: { projectId: req.params.id, userId: req.user.id, role: req.body.role },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });
  res.status(201).json(member);
});

// Leave project
projectsRouter.delete('/:id/leave', requireAuth, async (req, res) => {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.params.id, userId: req.user.id } },
  });
  if (!member) return res.status(404).json({ error: 'Not a member of this project' });
  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: req.params.id, userId: req.user.id } },
  });
  res.json({ message: 'Left project' });
});
