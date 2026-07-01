import { prisma } from './prisma.js';

/** If a temporary ban expired, clear ban flags and return updated user row. */
export async function resolveActiveBan(user) {
  if (!user?.isBanned) return { user, banned: false };

  if (user.banExpiresAt && new Date(user.banExpiresAt) <= new Date()) {
    const cleared = await prisma.user.update({
      where: { id: user.id },
      data: {
        isBanned: false,
        bannedAt: null,
        banExpiresAt: null,
        banReason: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        rank: true,
        avatarUrl: true,
        githubUrl: true,
        isAdmin: true,
        accountType: true,
        isBanned: true,
        bannedAt: true,
        banExpiresAt: true,
        banReason: true,
        passwordHash: true,
        company: {
          select: {
            id: true,
            legalName: true,
            website: true,
            verificationStatus: true,
          },
        },
      },
    });
    return { user: cleared, banned: false };
  }

  return { user, banned: true };
}

export function banStatusPayload(user) {
  const pendingAppeal = user.pendingAppeal ?? null;
  return {
    error: 'Your account access is currently restricted.',
    code: 'ACCOUNT_BANNED',
    banReason: user.banReason || 'This account was suspended for violating community guidelines.',
    bannedAt: user.bannedAt,
    banExpiresAt: user.banExpiresAt ?? null,
    isPermanent: !user.banExpiresAt,
    canAppeal: !pendingAppeal || pendingAppeal.status !== 'PENDING',
    appealStatus: pendingAppeal?.status ?? null,
  };
}
