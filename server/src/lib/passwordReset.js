import crypto from 'crypto';
import { prisma } from './prisma.js';

const RESET_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

export async function createPasswordResetToken(userId) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return raw;
}

export async function consumePasswordResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashResetToken(rawToken);
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  if (!row) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } });
  return row.userId;
}
