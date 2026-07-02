import { ApiError } from '@/shared/api/http';
import { apiDeploymentHint } from '@/shared/api/health';

export function formatLoadError(err: unknown): string {
  let msg = 'Could not load data.';
  if (err instanceof ApiError) msg = err.message;
  else if (err instanceof Error) msg = err.message;

  const hint = apiDeploymentHint();
  if (hint && !msg.includes('VITE_API_BASE_URL') && !msg.includes('Start the API')) {
    return `${msg} ${hint}`;
  }
  return msg;
}
