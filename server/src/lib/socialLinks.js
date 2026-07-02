/** Allowed keys stored in User.socialLinks JSON. */

export const SOCIAL_LINK_KEYS = [
  'linkedin',
  'twitter',
  'instagram',
  'youtube',
  'facebook',
  'tiktok',
  'threads',
  'bluesky',
  'mastodon',
  'discord',
  'telegram',
];

export function normalizeSocialLinks(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const raw = input[key];
    if (typeof raw !== 'string') continue;
    const t = raw.trim();
    if (!t) continue;
    try {
      const u = new URL(t);
      if (['http:', 'https:'].includes(u.protocol)) out[key] = t.slice(0, 2048);
    } catch {
      /* skip invalid */
    }
  }
  return Object.keys(out).length ? out : null;
}
