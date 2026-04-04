import type { ReactNode } from 'react';
import { AuthProvider } from '@/shared/components/AuthProvider';

/** Root providers (auth session, etc.). Add more wrappers here as the app grows. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
