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
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, name: true, rank: true, avatarUrl: true, isAdmin: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('requireAuth', err);
    const dev = process.env.NODE_ENV !== 'production';
    const msg = String(err.message || err);
    const unreachable = /reach database server at/i.test(msg);
    const hint = unreachable
      ? 'Wake the project in the Neon console and verify DATABASE_URL in server/.env (sslmode=require; try without channel_binding).'
      : err.code === 'P2022' || /column .* does not exist/i.test(msg)
        ? 'Run `npx prisma db push` in the server folder.'
        : undefined;
    return res.status(500).json({
      error: unreachable ? 'Database unavailable' : 'Authentication failed',
      ...(dev && { details: msg, code: err.code }),
      ...(hint && { hint }),
    });
  }
}

/** Use after requireAuth. Returns 403 if the user is not an admin. */
export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/** Attaches req.user when a valid Bearer token is present; never fails the request */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      req.user = undefined;
      return next();
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      req.user = undefined;
      return next();
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, name: true, rank: true, avatarUrl: true, isAdmin: true },
    });
    req.user = user ?? undefined;
  } catch (err) {
    console.error('optionalAuth', err);
    req.user = undefined;
  }
  next();
}
