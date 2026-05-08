'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AuthProvider } from '@/components/providers/auth-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell isAdmin>{children}</AppShell>
    </AuthProvider>
  );
}
