'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMe, demoLogin as apiDemoLogin, type AuthUser } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  demoLogin: (fid: number, username: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const demoLogin = async (fid: number, username: string) => {
    setLoading(true);
    try {
      const u = await apiDemoLogin(fid, username);
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    document.cookie = 'pulo_demo_session=; Max-Age=0; path=/';
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, demoLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
