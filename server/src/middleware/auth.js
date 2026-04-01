import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, username: true, name: true, rank: true, avatarUrl: true },
  });
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  next();
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  const decoded = verifyToken(token);
  if (!decoded) return next();
  prisma.user
    .findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, name: true, rank: true, avatarUrl: true },
    })
    .then((user) => {
      req.user = user || undefined;
      next();
    })
    .catch(() => next());
}
