import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
import { isUniqueConstraintError } from '../lib/prismaErrors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export const companiesRouter = Router();

async function findCompanyByUsername(username) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      accountType: true,
      company: true,
    },
  });
  if (!user || user.accountType !== 'COMPANY' || !user.company) return null;
  return { user, company: user.company };
}

companiesRouter.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.accountType !== 'COMPANY') {
      return res.status(403).json({ error: 'Company account required.' });
    }
    const company = await prisma.company.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        legalName: true,
        website: true,
        description: true,
        verificationStatus: true,
        verificationNote: true,
        verificationRequestedAt: true,
        verifiedAt: true,
      },
    });
    if (!company) return res.status(404).json({ error: 'Company profile not found.' });
    res.json(company);
  } catch (err) {
    sendRouteError(res, err, 'GET /api/companies/me', 'Could not load company');
  }
});

companiesRouter.patch(
  '/me',
  requireAuth,
  [
    body('legalName').optional().isString().trim().isLength({ min: 2, max: 120 }),
    body('website').optional().isURL({ require_protocol: true }),
    body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    try {
      if (req.user.accountType !== 'COMPANY') {
        return res.status(403).json({ error: 'Company account required.' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const data = {};
      if (req.body.legalName !== undefined) data.legalName = req.body.legalName.trim();
      if (req.body.website !== undefined) data.website = req.body.website.trim();
      if (req.body.description !== undefined) {
        data.description = req.body.description ? String(req.body.description).trim() : null;
      }
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update.' });
      }

      const company = await prisma.company.update({
        where: { userId: req.user.id },
        data,
        select: {
          id: true,
          legalName: true,
          website: true,
          description: true,
          verificationStatus: true,
          verificationNote: true,
          verificationRequestedAt: true,
          verifiedAt: true,
        },
      });
      if (data.legalName) {
        await prisma.user.update({ where: { id: req.user.id }, data: { name: data.legalName } });
      }
      res.json(company);
    } catch (err) {
      sendRouteError(res, err, 'PATCH /api/companies/me', 'Could not update company');
    }
  },
);

companiesRouter.post(
  '/me/apply-verification',
  requireAuth,
  [body('message').optional().isString().trim().isLength({ max: 1000 })],
  async (req, res) => {
    try {
      if (req.user.accountType !== 'COMPANY') {
        return res.status(403).json({ error: 'Company account required.' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const company = await prisma.company.findUnique({ where: { userId: req.user.id } });
      if (!company) return res.status(404).json({ error: 'Company profile not found.' });

      if (company.verificationStatus === 'VERIFIED') {
        return res.status(400).json({ error: 'Your company is already verified.' });
      }
      const legacyPending =
        company.verificationStatus === 'PENDING' && !company.verificationRequestedAt;
      if (company.verificationStatus === 'PENDING' && !legacyPending) {
        return res.status(409).json({ error: 'A verification request is already under review.' });
      }

      if (!['UNVERIFIED', 'REJECTED', 'PENDING'].includes(company.verificationStatus)) {
        return res.status(400).json({ error: 'Verification cannot be requested for this company.' });
      }

      const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          verificationStatus: 'PENDING',
          verificationRequestedAt: new Date(),
          verificationNote: message || null,
        },
        select: {
          id: true,
          legalName: true,
          website: true,
          description: true,
          verificationStatus: true,
          verificationNote: true,
          verificationRequestedAt: true,
          verifiedAt: true,
        },
      });
      res.json({
        company: updated,
        message: 'Verification request submitted. Our team will review your company profile.',
      });
    } catch (err) {
      sendRouteError(res, err, 'POST /api/companies/me/apply-verification', 'Could not submit verification');
    }
  },
);

companiesRouter.get('/:username', optionalAuth, async (req, res) => {
  try {
    const found = await findCompanyByUsername(req.params.username);
    if (!found) return res.status(404).json({ error: 'Company not found' });

    const { user, company } = found;
    const viewerId = req.user?.id;

    const [reviews, likeCount, viewerLike, reviewAgg] = await Promise.all([
      prisma.companyReview.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, username: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.companyLike.count({ where: { companyId: company.id } }),
      viewerId
        ? prisma.companyLike.findUnique({
            where: { companyId_userId: { companyId: company.id, userId: viewerId } },
          })
        : null,
      prisma.companyReview.aggregate({
        where: { companyId: company.id },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const viewerReview = viewerId
      ? reviews.find((r) => r.author.id === viewerId) ||
        (await prisma.companyReview.findUnique({
          where: { companyId_authorId: { companyId: company.id, authorId: viewerId } },
          select: {
            id: true,
            rating: true,
            body: true,
            createdAt: true,
            author: { select: { id: true, username: true, name: true, avatarUrl: true } },
          },
        }))
      : null;

    res.json({
      company: {
        id: company.id,
        legalName: company.legalName,
        website: company.website,
        description: company.description,
        verificationStatus: company.verificationStatus,
        verifiedAt: company.verifiedAt,
        likeCount,
        averageRating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
        reviewCount: reviewAgg._count.id,
        viewerLiked: Boolean(viewerLike),
        viewerReview,
      },
      reviews,
      username: req.params.username.toLowerCase(),
      userId: user.id,
    });
  } catch (err) {
    sendRouteError(res, err, 'GET /api/companies/:username', 'Could not load company');
  }
});

companiesRouter.post(
  '/:username/reviews',
  requireAuth,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('body').trim().isLength({ min: 10, max: 2000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const found = await findCompanyByUsername(req.params.username);
      if (!found) return res.status(404).json({ error: 'Company not found' });
      if (found.user.id === req.user.id) {
        return res.status(400).json({ error: 'You cannot review your own company.' });
      }

      const review = await prisma.companyReview.upsert({
        where: {
          companyId_authorId: { companyId: found.company.id, authorId: req.user.id },
        },
        create: {
          companyId: found.company.id,
          authorId: req.user.id,
          rating: req.body.rating,
          body: req.body.body.trim(),
        },
        update: {
          rating: req.body.rating,
          body: req.body.body.trim(),
        },
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, username: true, name: true, avatarUrl: true } },
        },
      });
      res.status(201).json(review);
    } catch (err) {
      sendRouteError(res, err, 'POST /api/companies/:username/reviews', 'Could not save review');
    }
  }
);

companiesRouter.post('/:username/like', requireAuth, async (req, res) => {
  try {
    const found = await findCompanyByUsername(req.params.username);
    if (!found) return res.status(404).json({ error: 'Company not found' });
    if (found.user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot like your own company.' });
    }

    const existing = await prisma.companyLike.findUnique({
      where: { companyId_userId: { companyId: found.company.id, userId: req.user.id } },
    });
    if (existing) {
      await prisma.companyLike.delete({ where: { id: existing.id } });
      const likeCount = await prisma.companyLike.count({ where: { companyId: found.company.id } });
      return res.json({ liked: false, likeCount });
    }
    try {
      await prisma.companyLike.create({
        data: { companyId: found.company.id, userId: req.user.id },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        const likeCount = await prisma.companyLike.count({ where: { companyId: found.company.id } });
        return res.json({ liked: true, likeCount });
      }
      throw err;
    }
    const likeCount = await prisma.companyLike.count({ where: { companyId: found.company.id } });
    res.json({ liked: true, likeCount });
  } catch (err) {
    sendRouteError(res, err, 'POST /api/companies/:username/like', 'Could not update like');
  }
});
