'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { VerdictBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockTruthChecks } from '@/lib/mock-data';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { Shield, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TruthDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const check = mockTruthChecks.find(c => c.id === id) ?? mockTruthChecks[0]!;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/dashboard/truth" className="inline-flex items-center gap-2 text-sm text-[--color-pulo-muted] hover:text-[--color-pulo-text]">
        <ArrowLeft className="w-4 h-4" />
        Back to Truth Checks
      </Link>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">&quot;{check.claim}&quot;</CardTitle>
            <VerdictBadge verdict={check.verdict} size="md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-[--color-pulo-muted]">
            {check.caster && <span>By @{check.caster}</span>}
            <span>Analyzed {formatRelativeTime(check.analyzedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-accent]">{Math.round(check.confidence * 100)}%</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-text]">{check.sources.length}</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-text]">{check.verdict}</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Verdict</div>
          </CardContent>
        </Card>
      </div>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {check.sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] hover:border-[--color-pulo-accent] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[--color-pulo-muted]" />
              <div className="flex-1">
                <div className="text-sm font-medium text-[--color-pulo-text]">{source.name}</div>
                <div className="text-xs text-[--color-pulo-muted] truncate">{source.url}</div>
              </div>
              <div className="text-sm text-[--color-pulo-muted]">
                {Math.round(source.credibility * 100)}% credible
              </div>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
