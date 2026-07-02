import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { sendRouteError } from '../lib/dbErrors.js';
import { parseListPagination } from '../lib/pagination.js';
import { viewerKeyFromRequest } from '../lib/viewerKey.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  listProjectsForViewer,
  getProjectDetailForViewer,
  toggleProjectLike,
  createProjectFromGithub,
  updateProjectByOwner,
  joinProject,
  leaveProject,
} from '../services/projectsService.js';

export const projectsRouter = Router();

projectsRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const { take, skip } = parseListPagination(req.query);
    const page = await listProjectsForViewer({
      viewerId: req.user?.id,
      status: req.query.status,
      type: req.query.type,
      search: req.query.search,
      take,
      skip,
    });
    res.json(page);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/projects', 'Could not list projects');
  }
});

projectsRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const out = await getProjectDetailForViewer(
      req.params.id,
      req.user?.id,
      viewerKeyFromRequest(req, req.user?.id),
    );
    if (out.notFound) return res.status(404).json({ error: 'Project not found' });
    if (out.githubRefreshScheduled) res.setHeader('X-Github-Refresh', 'scheduled');
    res.json(out.project);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/projects/:id', 'Could not load project');
  }
});

projectsRouter.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const out = await toggleProjectLike(req.params.id, req.user.id);
    if (out.notFound) return res.status(404).json({ error: 'Project not found' });
    res.json(out.payload);
  } catch (err) {
    sendRouteError(res, err, 'POST /api/projects/:id/like', 'Could not update like');
  }
});

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
    body('rolesNeeded').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const out = await createProjectFromGithub(req.user.id, req.body);
      if (out.badRequest) return res.status(400).json(out.badRequest);
      if (out.badGateway) return res.status(502).json(out.badGateway);
      res.status(201).json(out.created);
    } catch (err) {
      sendRouteError(res, err, 'POST /api/projects', 'Could not create project');
    }
  },
);

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
    body('rolesNeeded').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const out = await updateProjectByOwner(req.params.id, req.user.id, req.body);
      if (out.notFound) return res.status(404).json({ error: 'Project not found' });
      if (out.forbidden) return res.status(403).json({ error: 'Only the owner can update this project' });
      if (out.badRequest) return res.status(400).json(out.badRequest);
      if (out.badGateway) return res.status(502).json(out.badGateway);
      res.json(out.updated);
    } catch (err) {
      sendRouteError(res, err, 'PATCH /api/projects/:id', 'Could not update project');
    }
  },
);

projectsRouter.post('/:id/join', requireAuth, [body('role').trim().notEmpty()], async (req, res) => {
  try {
    const out = await joinProject(req.params.id, req.user.id, req.body.role);
    if (out.notFound) return res.status(404).json({ error: 'Project not found' });
    if (out.badRequest) return res.status(400).json(out.badRequest);
    res.status(201).json(out.created);
  } catch (err) {
    sendRouteError(res, err, 'POST /api/projects/:id/join', 'Could not join project');
  }
});

projectsRouter.delete('/:id/leave', requireAuth, async (req, res) => {
  try {
    const out = await leaveProject(req.params.id, req.user.id);
    if (out.notFound) return res.status(404).json({ error: 'Not a member of this project' });
    res.json({ message: 'Left project' });
  } catch (err) {
    sendRouteError(res, err, 'DELETE /api/projects/:id/leave', 'Could not leave project');
  }
});
