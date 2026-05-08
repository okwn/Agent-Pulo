'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Search, MessageCircle, Bell, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const docs = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of PULO and how to set it up.',
    icon: Zap,
    href: '/docs#getting-started',
  },
  {
    title: 'Truth Analysis',
    description: 'How to use PULO to verify claims and check facts.',
    icon: Search,
    href: '/docs#truth-analysis',
  },
  {
    title: 'Trend Radar',
    description: 'Detecting and tracking emerging trends.',
    icon: Bell,
    href: '/docs#trend-radar',
  },
  {
    title: 'Reply Assistant',
    description: 'Using AI to craft context-aware replies.',
    icon: MessageCircle,
    href: '/docs#reply-assistant',
  },
];

export default function DocsPage() {
  return (
    <div className="px-6 py-12 max-w-5xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-[--color-pulo-text] mb-4">Documentation</h1>
        <p className="text-[--color-pulo-muted] max-w-xl">
          Everything you need to know about PULO, from setup to advanced features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {docs.map((doc) => {
          const Icon = doc.icon;
          return (
            <Link key={doc.title} href={doc.href}>
              <Card hover className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-[--color-pulo-accent-muted]">
                      <Icon className="w-6 h-6 text-[--color-pulo-accent]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[--color-pulo-text] mb-1">{doc.title}</h3>
                      <p className="text-sm text-[--color-pulo-muted]">{doc.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[--color-pulo-muted]" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* API Reference Preview */}
      <Card>
        <CardHeader>
          <CardTitle>API Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[--color-pulo-bg] rounded-lg p-4 font-mono text-sm">
            <pre className="text-[--color-pulo-text] overflow-x-auto">
{`# Check a claim
POST /api/truth
{ "claim": "Ethereum is switching to proof-of-stake" }

# Get trends
GET /api/radar?status=active

# Send alert
POST /api/alerts
{ "type": "trend", "title": "New airdrop detected" }`}
            </pre>
          </div>
          <p className="text-xs text-[--color-pulo-muted] mt-4">[MOCK API - Awaiting implementation]</p>
        </CardContent>
      </Card>
    </div>
  );
}
