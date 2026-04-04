import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/shared/api/types';

type AuthState = { user: User | null; token: string | null; ready: boolean };

type AuthContextValue = AuthState & {
  login: (u: User, t: string) => void;
  logout: () => void;
  /** Merge fields into the current user (e.g. after profile save) and persist to localStorage */
  updateSessionUser: (partial: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue>(null!);

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

  const updateSessionUser = (partial: Partial<User>) => {
    setState((s: AuthState) => {
      if (!s.user) return s;
      const next = { ...s.user, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return { ...s, user: next };
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateSessionUser }}>
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
