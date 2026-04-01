import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export const projectsRouter = Router();

// List projects (with optional filters)
projectsRouter.get('/', optionalAuth, async (req, res) => {
  const { status, type, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (search && String(search).trim()) {
    where.OR = [
      { title: { contains: String(search).trim(), mode: 'insensitive' } },
      { description: { contains: String(search).trim(), mode: 'insensitive' } },
    ];
  }
  const projects = await prisma.project.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
      members: { select: { role: true, user: { select: { id: true, name: true, username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(projects);
});

// Get one project
projectsRouter.get('/:id', optionalAuth, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
      members: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
    },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// Create project (auth required)
projectsRouter.post(
  '/',
  requireAuth,
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').trim().notEmpty(),
    body('type').optional().isIn(['OPEN_SOURCE', 'HACKATHON', 'LEARNING']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, description, type = 'LEARNING' } = req.body;
    const project = await prisma.project.create({
      data: { title, description, type, ownerId: req.user.id },
      include: {
        owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
    });
    res.status(201).json(project);
  }
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
  ],
  async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only the owner can update this project' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, description, status, type } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (type !== undefined) data.type = type;
    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: { owner: { select: { id: true, name: true, username: true } } },
    });
    res.json(updated);
  }
);

// Join project (auth required)
projectsRouter.post('/:id/join', requireAuth, [body('role').trim().notEmpty()], async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
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
