'use client';

import { cn } from '@/lib/utils';
import { Search, Bell, Command, User } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function Topbar({ title, breadcrumb }: TopbarProps) {
  return (
    <header className="h-16 bg-[--color-pulo-surface] border-b border-[--color-pulo-border] flex items-center justify-between px-6">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumb ? (
          <>
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-[--color-pulo-border]">/</span>}
                {item.href ? (
                  <Link href={item.href} className="text-[--color-pulo-muted] hover:text-[--color-pulo-text]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[--color-pulo-text] font-medium">{item.label}</span>
                )}
              </span>
            ))}
          </>
        ) : (
          <span className="text-[--color-pulo-text] font-medium">{title || 'Dashboard'}</span>
        )}
      </div>

      {/* Center: Search */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] hover:border-[--color-pulo-border-light] focus-within:border-[--color-pulo-accent] transition-colors w-96">
        <Search className="w-4 h-4 text-[--color-pulo-muted]" />
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm text-[--color-pulo-text] placeholder:text-[--color-pulo-muted] focus:outline-none"
        />
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[--color-pulo-surface] border border-[--color-pulo-border] text-xs text-[--color-pulo-muted]">
          <Command className="w-3 h-3" />K
        </kbd>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-[--color-pulo-border] transition-colors text-[--color-pulo-muted] hover:text-[--color-pulo-text]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[--color-pulo-danger]" />
        </button>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[--color-pulo-border] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[--color-pulo-accent] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </Link>
      </div>
    </header>
  );
}
