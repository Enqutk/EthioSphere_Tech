import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { requireAuth } from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.post(
  '/',
  requireAuth,
  [
    body('targetType').isIn(['user', 'company']),
    body('targetUsername').trim().notEmpty(),
    body('reason').isIn(['SPAM', 'FAKE', 'HARASSMENT', 'OTHER']),
    body('details').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { targetType, targetUsername, reason, details } = req.body;
      const username = String(targetUsername).toLowerCase();

      const target = await prisma.user.findUnique({
        where: { username },
        select: { id: true, accountType: true, company: { select: { id: true } } },
      });
      if (!target) return res.status(404).json({ error: 'Profile not found' });
      if (target.id === req.user.id) {
        return res.status(400).json({ error: 'You cannot report yourself.' });
      }

      if (targetType === 'company') {
        if (target.accountType !== 'COMPANY' || !target.company) {
          return res.status(400).json({ error: 'This profile is not a company account.' });
        }
      }

      const recent = await prisma.profileReport.findFirst({
        where: {
          reporterId: req.user.id,
          ...(targetType === 'company'
            ? { companyId: target.company.id }
            : { targetUserId: target.id }),
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (recent) {
        return res.status(429).json({ error: 'You already reported this profile recently. Our team will review it.' });
      }

      const report = await prisma.profileReport.create({
        data: {
          reporterId: req.user.id,
          reason,
          details: details?.trim() || null,
          ...(targetType === 'company'
            ? { companyId: target.company.id }
            : { targetUserId: target.id }),
        },
        select: { id: true, status: true, createdAt: true },
      });
      res.status(201).json({ ok: true, report });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/reports', 'Could not submit report');
    }
  }
);
