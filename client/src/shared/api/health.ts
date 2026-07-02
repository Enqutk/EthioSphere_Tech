import { api, getApiBaseUrl } from './http';

export type HealthResponse = {
  ok: boolean;
  message?: string;
  db?: string;
};

/** Hint when the frontend is deployed without a separate API URL (common Vercel misconfiguration). */
export function apiDeploymentHint(): string | null {
  const base = getApiBaseUrl();
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (!base && !isLocal) {
    return 'Production frontend must set VITE_API_BASE_URL to your API Vercel URL, then redeploy.';
  }
  if (!base && isLocal) {
    return 'Start the API (cd server && npm run dev) or set VITE_API_BASE_URL in client/.env.';
  }
  return null;
}

export const healthApi = {
  check() {
    return api<HealthResponse>('/api/health', { cacheMs: 0 });
  },
};
