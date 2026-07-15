import crypto from 'crypto';
import { prisma } from './prisma.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function hashEmailVerifyToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

export async function createEmailVerificationToken(userId) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashEmailVerifyToken(raw);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return raw;
}

export async function consumeEmailVerificationToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashEmailVerifyToken(rawToken);
  const row = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  if (!row) return null;

  await prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } });
  return row.userId;
}

/**
 * One-time safety for existing accounts after emailVerifiedAt was introduced:
 * users with no pending verification token are treated as already verified.
 */
export async function grandfatherLegacyEmailVerification() {
  try {
    const result = await prisma.user.updateMany({
      where: {
        emailVerifiedAt: null,
        emailVerificationTokens: { none: {} },
      },
      data: { emailVerifiedAt: new Date() },
    });
    if (result.count > 0) {
      console.log(`Grandfathered ${result.count} existing user(s) as email-verified`);
    }
  } catch (err) {
    console.warn('grandfatherLegacyEmailVerification skipped:', err?.message || err);
  }
}
