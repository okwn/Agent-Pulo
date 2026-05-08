import type { Metadata } from 'next';
import '../globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PULO — AI Intelligence Agent',
  description: 'Farcaster-native AI agent for truth analysis, trend radar, and reply assistance.',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[--color-pulo-border] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[--color-pulo-accent] flex items-center justify-center">
            <span className="font-bold text-white text-sm">P</span>
          </div>
          <Link href="/" className="font-bold text-lg tracking-tight text-[--color-pulo-text]">PULO</Link>
          <span className="text-[10px] bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded px-1.5 py-0.5 text-[--color-pulo-muted] font-medium">
            BETA
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-[--color-pulo-muted]">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/login" className="px-3 py-1.5 bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded hover:border-[--color-pulo-accent] transition-colors text-[--color-pulo-text]">
            Login
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-[--color-pulo-border] px-6 py-4 text-xs text-[--color-pulo-muted] flex justify-between">
        <span>PULO · Built on Far · v0.1.0</span>
        <span>Phase 11 · UI Development</span>
      </footer>
    </div>
  );
}
