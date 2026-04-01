import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/api';

type AuthState = { user: User | null; token: string | null; ready: boolean };

const AuthContext = createContext<AuthState & { login: (u: User, t: string) => void; logout: () => void }>(null!);

const TOKEN_KEY = 'pw_token';
const USER_KEY = 'pw_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, ready: false });

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const u = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    setState({ token: t, user: u ? JSON.parse(u) : null, ready: true });
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState((s: AuthState) => ({ ...s, user, token }));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState((s: AuthState) => ({ ...s, user: null, token: null }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
