/**
 * Central place for environment-driven settings (no secrets committed; use .env).
 */
const DEV_JWT_SECRET = 'dev-secret-change-in-production';

export const config = {
  port: Number(process.env.SERVER_PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Comma-separated origins, or unset → cors reflects request origin in dev */
  clientOrigin: process.env.CLIENT_ORIGIN,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

export function isProductionEnv() {
  return config.nodeEnv === 'production';
}

function parseClientOrigins() {
  const raw = config.clientOrigin;
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** JWT signing key — dev fallback only; production requires JWT_SECRET. */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (isProductionEnv() && !secret) {
    throw new Error('JWT_SECRET must be set in production (e.g. Vercel Environment Variables).');
  }
  return secret || DEV_JWT_SECRET;
}

/** Fail fast in production when required env vars are missing or unsafe. */
export function validateProductionConfig() {
  if (!isProductionEnv()) return;

  getJwtSecret();

  if (parseClientOrigins().length === 0) {
    throw new Error(
      'CLIENT_ORIGIN must be set in production (comma-separated frontend URL(s), e.g. https://your-app.vercel.app).',
    );
  }

  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new Error(
      'GITHUB_TOKEN must be set in production (GitHub classic PAT with no scopes — raises API limit from 60/hr to 5,000/hr).',
    );
  }
}

export function getClientOrigin() {
  const origins = parseClientOrigins();
  if (origins.length > 0) return origins[0];
  return 'http://localhost:3000';
}

export function getCorsOrigin() {
  const origins = parseClientOrigins();
  if (origins.length > 0) return origins;
  if (isProductionEnv()) {
    throw new Error('CLIENT_ORIGIN must be set in production.');
  }
  return true;
}
