import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { resolveActiveBan, banStatusPayload } from '../lib/banHelpers.js';
import { getJwtSecret } from '../config/index.js';
import { readSessionToken } from '../lib/sessionCookie.js';

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const token = readSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        rank: true,
        avatarUrl: true,
        isAdmin: true,
        accountType: true,
        isBanned: true,
        bannedAt: true,
        banExpiresAt: true,
        banReason: true,
      },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const { user: activeUser, banned } = await resolveActiveBan(user);
    if (banned) {
      return res.status(403).json(banStatusPayload(activeUser));
    }
    req.user = {
      id: activeUser.id,
      email: activeUser.email,
      username: activeUser.username,
      name: activeUser.name,
      rank: activeUser.rank,
      avatarUrl: activeUser.avatarUrl,
      isAdmin: activeUser.isAdmin,
      accountType: activeUser.accountType,
    };
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

/**
 * Valid Bearer → req.user = { id } from JWT only (no DB). Read routes avoid an extra DB round-trip
 * before their main query; helps when the database is slow to wake (Neon) so the dev proxy doesn’t
 * sit ~2min then return text/plain. Routes needing rank/isAdmin must load them or use requireAuth.
 */
export function optionalAuth(req, res, next) {
  try {
    const token = readSessionToken(req);
    if (!token) {
      req.user = undefined;
      return next();
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      req.user = undefined;
      return next();
    }
    req.user = { id: decoded.userId };
  } catch (err) {
    console.error('optionalAuth', err);
    req.user = undefined;
  }
  next();
}
