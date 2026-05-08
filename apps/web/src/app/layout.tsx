import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PULO — AI Intelligence Agent',
  description: 'Farcaster-native AI agent for truth analysis, trend radar, and reply assistance.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23a855f7"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="18" font-weight="bold" fill="white">P</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[--color-pulo-bg] text-[--color-pulo-text] antialiased">
        {children}
      </body>
    </html>
  );
}
