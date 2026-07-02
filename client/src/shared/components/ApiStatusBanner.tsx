import { useApiStatus } from '@/shared/components/ApiStatusProvider';
import { getApiBaseUrl } from '@/shared/api/http';

export function ApiStatusBanner() {
  const { status, message, retry } = useApiStatus();

  if (status === 'checking' || status === 'ok') return null;

  const apiBase = getApiBaseUrl();

  return (
    <div
      className="relative z-20 border-b border-terminal-red/40 bg-terminal-red/15 px-4 py-3 text-center text-sm text-red-100"
      role="alert"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-red-200">
        API offline
      </p>
      <p className="mx-auto mt-1 max-w-3xl whitespace-pre-wrap leading-relaxed">{message}</p>
      {!apiBase && (
        <p className="mx-auto mt-2 max-w-3xl font-mono text-xs text-red-200/90">
          Deploy the <code className="text-red-100">server/</code> folder as a separate Vercel project, then set{' '}
          <code className="text-red-100">VITE_API_BASE_URL</code> on the frontend and redeploy.
        </p>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="mt-3 rounded border border-red-400/50 px-3 py-1 font-mono text-xs uppercase tracking-wide text-red-100 hover:bg-red-500/20"
      >
        Retry connection
      </button>
    </div>
  );
}
