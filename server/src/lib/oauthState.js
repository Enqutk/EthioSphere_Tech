import crypto from 'crypto';
import { getJwtSecret } from '../config/index.js';
import { createOAuthState } from './googleOAuth.js';

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

export function signedOAuthState(extra = {}) {
  const payload = { ts: Date.now(), nonce: createOAuthState(), ...extra };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySignedOAuthState(state) {
  if (!state || typeof state !== 'string') return null;
  const dot = state.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getJwtSecret()).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!data.ts || Date.now() - data.ts > OAUTH_STATE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

/** @internal test helper */
export function buildExpiredOAuthState(extra = {}) {
  const payload = { ts: Date.now() - OAUTH_STATE_TTL_MS - 1000, nonce: createOAuthState(), ...extra };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
