export const DEFAULT_NOTIFICATION_PREFS = {
  emailOnMessage: true,
  emailOnFollow: true,
  emailOnChallenge: true,
  emailOnProjectInvite: true,
  emailOnCommunityReply: true,
  /** Browser / device push via Firebase (when configured) */
  pushEnabled: true,
};

export function normalizeNotificationPrefs(input) {
  const base = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!input || typeof input !== 'object') return base;
  for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFS)) {
    if (typeof input[key] === 'boolean') base[key] = input[key];
  }
  return base;
}
