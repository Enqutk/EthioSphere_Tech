import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { sendRouteError } from '../lib/dbErrors.js';
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
    await prisma.companyLike.create({
      data: { companyId: found.company.id, userId: req.user.id },
    });
    const likeCount = await prisma.companyLike.count({ where: { companyId: found.company.id } });
    res.json({ liked: true, likeCount });
  } catch (err) {
    sendRouteError(res, err, 'POST /api/companies/:username/like', 'Could not update like');
  }
});
