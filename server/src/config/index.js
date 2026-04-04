/**
 * Central place for environment-driven settings (no secrets committed; use .env).
 */
export const config = {
  port: Number(process.env.SERVER_PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Comma-separated origins, or unset → cors reflects request origin in dev */
  clientOrigin: process.env.CLIENT_ORIGIN,
};

export function getCorsOrigin() {
  const raw = config.clientOrigin;
  if (raw && String(raw).trim()) {
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return true;
}
