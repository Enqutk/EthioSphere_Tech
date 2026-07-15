import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../realtime/socket.js';
import { getFirebaseMessaging } from '../lib/firebaseAdmin.js';
import { normalizeNotificationPrefs } from '../lib/notificationPrefs.js';

const actorSelect = { id: true, name: true, username: true, avatarUrl: true };

function shapeNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkUrl: row.linkUrl,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt,
    createdAt: row.createdAt,
    actor: row.actor ?? null,
  };
}

async function pushFcm(userId, notification) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });
  const prefs = normalizeNotificationPrefs(user?.notificationPrefs);
  if (!prefs.pushEnabled) return;

  const tokens = await prisma.fcmDeviceToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (!tokens.length) return;

  const tokenList = tokens.map((t) => t.token);
  try {
    const result = await messaging.sendEachForMulticast({
      tokens: tokenList,
      notification: {
        title: notification.title,
        body: notification.body || undefined,
      },
      data: {
        notificationId: notification.id,
        type: notification.type,
        linkUrl: notification.linkUrl || '',
      },
      webpush: {
        fcmOptions: notification.linkUrl ? { link: notification.linkUrl } : undefined,
      },
    });
    const bad = [];
    result.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (
          code.includes('registration-token-not-registered') ||
          code.includes('invalid-registration-token')
        ) {
          bad.push(tokenList[i]);
        }
      }
    });
    if (bad.length) {
      await prisma.fcmDeviceToken.deleteMany({ where: { token: { in: bad } } });
    }
  } catch (err) {
    console.warn('FCM push failed:', err?.message || err);
  }
}

/**
 * Persist a notification, emit over Socket.io, and optionally send FCM.
 * No-op when recipient is missing or is the actor.
 */
export async function createNotification({
  userId,
  actorId = null,
  type,
  title,
  body = null,
  linkUrl = null,
  entityType = null,
  entityId = null,
}) {
  if (!userId || (actorId && userId === actorId)) return null;

  const row = await prisma.notification.create({
    data: {
      userId,
      actorId,
      type,
      title,
      body,
      linkUrl,
      entityType,
      entityId,
    },
    include: { actor: { select: actorSelect } },
  });

  const payload = shapeNotification(row);
  emitToUser(userId, 'notification:new', payload);
  void pushFcm(userId, payload);
  return payload;
}

export async function listNotifications(userId, { limit = 40, cursor } = {}) {
  const take = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const rows = await prisma.notification.findMany({
    where: {
      userId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: { actor: { select: actorSelect } },
  });
  return rows.map(shapeNotification);
}

export async function unreadNotificationCount(userId) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId, id) {
  const row = await prisma.notification.findFirst({ where: { id, userId } });
  if (!row) return { notFound: true };
  if (row.readAt) return { notification: shapeNotification({ ...row, actor: undefined }) };
  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
    include: { actor: { select: actorSelect } },
  });
  emitToUser(userId, 'notification:read', { id });
  return { notification: shapeNotification(updated) };
}

export async function markAllNotificationsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  emitToUser(userId, 'notification:read-all', {});
  return { ok: true };
}

export async function upsertFcmToken(userId, token) {
  const trimmed = String(token || '').trim();
  if (!trimmed || trimmed.length > 4096) return { badRequest: true };
  await prisma.fcmDeviceToken.upsert({
    where: { token: trimmed },
    create: { userId, token: trimmed },
    update: { userId },
  });
  return { ok: true };
}

export async function removeFcmToken(userId, token) {
  const trimmed = String(token || '').trim();
  if (!trimmed) return { ok: true };
  await prisma.fcmDeviceToken.deleteMany({ where: { userId, token: trimmed } });
  return { ok: true };
}

/** Helpers for social events */

export async function notifyMessage({ recipientId, actorId, actorName, threadPeerId, preview }) {
  return createNotification({
    userId: recipientId,
    actorId,
    type: 'MESSAGE',
    title: `${actorName} sent you a message`,
    body: preview?.slice(0, 120) || null,
    linkUrl: `/inbox/${threadPeerId}`,
    entityType: 'user',
    entityId: actorId,
  });
}

export async function notifyProjectLike({ ownerId, actorId, actorName, projectId, projectTitle }) {
  return createNotification({
    userId: ownerId,
    actorId,
    type: 'PROJECT_LIKE',
    title: `${actorName} liked your project`,
    body: projectTitle || null,
    linkUrl: `/projects/${projectId}`,
    entityType: 'project',
    entityId: projectId,
  });
}

export async function notifyCompanyLike({ ownerId, actorId, actorName, ownerUsername }) {
  return createNotification({
    userId: ownerId,
    actorId,
    type: 'COMPANY_LIKE',
    title: `${actorName} liked your company`,
    body: null,
    linkUrl: `/profile/${ownerUsername}`,
    entityType: 'company',
    entityId: ownerId,
  });
}

export async function notifyFollowRequest({ followeeId, actorId, actorName }) {
  return createNotification({
    userId: followeeId,
    actorId,
    type: 'FOLLOW_REQUEST',
    title: `${actorName} requested to follow you`,
    body: null,
    linkUrl: `/inbox`,
    entityType: 'user',
    entityId: actorId,
  });
}

export async function notifyFollowAccepted({ followerId, actorId, actorName, actorUsername }) {
  return createNotification({
    userId: followerId,
    actorId,
    type: 'FOLLOW_ACCEPTED',
    title: `${actorName} accepted your follow request`,
    body: null,
    linkUrl: `/profile/${actorUsername}`,
    entityType: 'user',
    entityId: actorId,
  });
}

export async function notifyPostComment({
  recipientId,
  actorId,
  actorName,
  postId,
  preview,
  isReply,
}) {
  return createNotification({
    userId: recipientId,
    actorId,
    type: isReply ? 'POST_REPLY' : 'POST_COMMENT',
    title: isReply ? `${actorName} replied to your comment` : `${actorName} commented on your post`,
    body: preview?.slice(0, 120) || null,
    linkUrl: `/community/${postId}`,
    entityType: 'post',
    entityId: postId,
  });
}

export async function notifySubmissionLike({
  authorId,
  actorId,
  actorName,
  challengeId,
  submissionId,
}) {
  return createNotification({
    userId: authorId,
    actorId,
    type: 'SUBMISSION_LIKE',
    title: `${actorName} liked your challenge submission`,
    body: null,
    linkUrl: `/challenges/${challengeId}`,
    entityType: 'submission',
    entityId: submissionId,
  });
}

export async function notifySubmissionComment({
  authorId,
  actorId,
  actorName,
  challengeId,
  submissionId,
  preview,
}) {
  return createNotification({
    userId: authorId,
    actorId,
    type: 'SUBMISSION_COMMENT',
    title: `${actorName} commented on your submission`,
    body: preview?.slice(0, 120) || null,
    linkUrl: `/challenges/${challengeId}`,
    entityType: 'submission',
    entityId: submissionId,
  });
}
