import { isProductionEnv } from '../config/index.js';

export const SESSION_COOKIE_NAME = 'pw_session';

/** Match JWT expiry in middleware/auth.js */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
  const production = isProductionEnv();
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  };
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(res) {
  const production = isProductionEnv();
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
  });
}

/** Session JWT from httpOnly cookie, with optional Bearer fallback. */
export function readSessionToken(req) {
  const fromCookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.trim()) return fromCookie.trim();
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}
