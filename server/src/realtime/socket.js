import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import { SESSION_COOKIE_NAME } from '../lib/sessionCookie.js';
import { getCorsOrigin } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { resolveActiveBan } from '../lib/banHelpers.js';

/** @type {import('socket.io').Server | null} */
let io = null;

function parseCookieHeader(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    let value = part.slice(i + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep raw */
    }
    out[key] = value;
  }
  return out;
}

function readTokenFromSocket(socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
  const header = socket.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
  const cookies = parseCookieHeader(socket.handshake.headers?.cookie);
  const fromCookie = cookies[SESSION_COOKIE_NAME];
  return typeof fromCookie === 'string' && fromCookie.trim() ? fromCookie.trim() : null;
}

/**
 * Attach Socket.io to an HTTP server. No-op on serverless (Vercel).
 * Clients join room `user:<id>` after cookie/JWT auth.
 */
export function attachSocketIo(httpServer) {
  if (process.env.VERCEL) return null;

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: getCorsOrigin(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = readTokenFromSocket(socket);
      if (!token) return next(new Error('Unauthorized'));
      const decoded = verifyToken(token);
      if (!decoded?.userId) return next(new Error('Unauthorized'));
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          isBanned: true,
          bannedAt: true,
          banExpiresAt: true,
          banReason: true,
        },
      });
      if (!user) return next(new Error('Unauthorized'));
      const { banned } = await resolveActiveBan(user);
      if (banned) return next(new Error('Forbidden'));
      socket.data.userId = user.id;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    if (userId) socket.join(`user:${userId}`);
  });

  return io;
}

export function getIo() {
  return io;
}

/** Push a realtime event to every socket in a user's room. */
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}
