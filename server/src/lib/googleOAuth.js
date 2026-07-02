import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri() {
  if (process.env.GOOGLE_REDIRECT_URI?.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }
  if (process.env.API_PUBLIC_URL?.trim()) {
    return `${process.env.API_PUBLIC_URL.trim().replace(/\/+$/, '')}/api/auth/google/callback`;
  }
  const port = process.env.SERVER_PORT || 4000;
  return `http://localhost:${port}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function createOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

export async function exchangeGoogleCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || 'Google token exchange failed');
    err.status = 400;
    throw err;
  }
  return data;
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Could not load Google profile');
    err.status = 400;
    throw err;
  }
  if (!data.email || !data.verified_email) {
    const err = new Error('Google account must have a verified email');
    err.status = 400;
    throw err;
  }
  return data;
}

export async function suggestUniqueUsername(prisma, email, name) {
  const fromEmail = String(email).split('@')[0] || 'user';
  const fromName = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  const base = (fromName || fromEmail.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user').slice(0, 24);
  for (let i = 0; i < 20; i++) {
    const suffix = i === 0 ? '' : `_${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate = `${base}${suffix}`.slice(0, 30);
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
  return `user_${crypto.randomBytes(4).toString('hex')}`;
}
