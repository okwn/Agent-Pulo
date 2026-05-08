'use client';

import { AuthProvider as AuthProviderBase } from '@/lib/auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderBase>{children}</AuthProviderBase>;
}

export { useAuth } from '@/lib/auth-context';
