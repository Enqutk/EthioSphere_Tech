import type { ReactNode } from 'react';
import { ApiStatusProvider } from '@/shared/components/ApiStatusProvider';
import { AuthProvider } from '@/shared/components/AuthProvider';

/** Root providers (auth session, etc.). Add more wrappers here as the app grows. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ApiStatusProvider>
      <AuthProvider>{children}</AuthProvider>
    </ApiStatusProvider>
  );
}
