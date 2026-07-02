import React, { createContext, useContext, useEffect, useState } from 'react';
import { usersApi, authApi } from '@/shared/api';
import type { User } from '@/shared/api/types';

type AuthState = { user: User | null; ready: boolean };

type AuthContextValue = AuthState & {
  login: (user: User) => void;
  logout: () => Promise<void>;
  /** Merge fields into the current user (e.g. after profile save) */
  updateSessionUser: (partial: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue>(null!);

const LEGACY_TOKEN_KEY = 'pw_token';
const LEGACY_USER_KEY = 'pw_user';

export function mapSessionUser(profile: Record<string, unknown>): User {
  return {
    id: String(profile.id),
    email: String(profile.email),
    username: String(profile.username),
    name: String(profile.name),
    rank: String(profile.rank),
    avatarUrl: (profile.avatarUrl as string | null | undefined) ?? null,
    githubUrl: (profile.githubUrl as string | null | undefined) ?? null,
    isAdmin: Boolean(profile.isAdmin),
    accountType: profile.accountType as User['accountType'],
    primaryDiscipline: profile.primaryDiscipline as User['primaryDiscipline'],
    company: profile.company as User['company'],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    }

    usersApi
      .me()
      .then((profile) => setState({ user: mapSessionUser(profile), ready: true }))
      .catch(() => setState({ user: null, ready: true }));
  }, []);

  const login = (user: User) => {
    setState((s) => ({ ...s, user }));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* cookie may already be cleared */
    }
    setState((s) => ({ ...s, user: null }));
  };

  const updateSessionUser = (partial: Partial<User>) => {
    setState((s) => {
      if (!s.user) return s;
      return { ...s, user: { ...s.user, ...partial } };
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

/** @deprecated Session uses httpOnly cookies; kept for gradual call-site cleanup. */
export function getStoredToken(): null {
  return null;
}
