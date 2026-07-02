import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiDeploymentHint, healthApi } from '@/shared/api/health';
import { formatLoadError } from '@/shared/lib/loadError';

type ApiStatus = 'checking' | 'ok' | 'down';

type ApiStatusContextValue = {
  status: ApiStatus;
  message: string;
  retry: () => void;
};

const ApiStatusContext = createContext<ApiStatusContextValue | null>(null);

export function ApiStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [message, setMessage] = useState('');

  const retry = useCallback(async () => {
    setStatus('checking');
    setMessage('');
    try {
      const res = await healthApi.check();
      if (res.ok) {
        setStatus('ok');
        return;
      }
      setStatus('down');
      setMessage(res.db === 'error' ? 'API is up but the database is unavailable.' : 'API health check failed.');
    } catch (err) {
      setStatus('down');
      const hint = apiDeploymentHint();
      const base = formatLoadError(err);
      setMessage(hint && !base.includes(hint) ? `${base} ${hint}` : base);
    }
  }, []);

  useEffect(() => {
    retry();
  }, [retry]);

  return (
    <ApiStatusContext.Provider value={{ status, message, retry }}>
      {children}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  const ctx = useContext(ApiStatusContext);
  if (!ctx) throw new Error('useApiStatus must be used within ApiStatusProvider');
  return ctx;
}
