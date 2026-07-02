import crypto from 'crypto';

/** Stable viewer identity for deduplicated view counts (logged-in user or hashed IP). */
export function viewerKeyFromRequest(req, userId) {
  if (userId) return `user:${userId}`;

  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded?.[0])?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  const hash = crypto.createHash('sha256').update(`pw-view:${ip}`).digest('hex').slice(0, 24);
  return `anon:${hash}`;
}
