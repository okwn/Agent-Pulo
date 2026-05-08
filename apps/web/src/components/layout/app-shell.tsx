'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface AppShellProps {
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
  onSidebarChange?: (collapsed: boolean) => void;
  isAdmin?: boolean;
}

export function AppShell({ children, sidebarCollapsed: initialCollapsed = false, onSidebarChange, isAdmin }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialCollapsed);

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    onSidebarChange?.(newState);
  };

  return (
    <div className="min-h-screen bg-[--color-pulo-bg] flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} isAdmin={isAdmin} />
      <div className={cn('flex-1 flex flex-col transition-all duration-200', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
