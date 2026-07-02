/** Block / mute checks for direct messages. */

export async function getDmBlockStatus(prisma, viewerId, otherId) {
  const [blockedByMe, blockedMe] = await Promise.all([
    prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: otherId } },
    }),
    prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: otherId, blockedId: viewerId } },
    }),
  ]);
  return {
    blockedByMe: Boolean(blockedByMe),
    blockedMe: Boolean(blockedMe),
    blockedEitherWay: Boolean(blockedByMe || blockedMe),
  };
}

export async function isDmMuted(prisma, userId, otherUserId) {
  const row = await prisma.dmMute.findUnique({
    where: { userId_mutedUserId: { userId, mutedUserId: otherUserId } },
  });
  return Boolean(row);
}

/** Returns { status, error } when the sender must not message the recipient. */
export async function assertCanSendDm(prisma, senderId, recipientId) {
  const { blockedByMe, blockedMe } = await getDmBlockStatus(prisma, senderId, recipientId);
  if (blockedMe) {
    return { status: 403, error: 'You cannot message this user.' };
  }
  if (blockedByMe) {
    return { status: 403, error: 'You blocked this user. Unblock them to send messages.' };
  }
  return null;
}

/** Returns { status, error } when the viewer must not open the thread. */
export async function assertCanViewDmThread(prisma, viewerId, otherId) {
  const { blockedMe } = await getDmBlockStatus(prisma, viewerId, otherId);
  if (blockedMe) {
    return { status: 403, error: 'You cannot view this conversation.' };
  }
  return null;
}

export async function listBlockedUsers(prisma, blockerId) {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId },
    orderBy: { createdAt: 'desc' },
    include: {
      blocked: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => ({ ...r.blocked, blockedAt: r.createdAt }));
}
