'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VerdictBadge } from '@/components/ui/badge';
import type { TruthCheck } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { ExternalLink, CheckCircle, XCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface TruthReportCardProps {
  truthCheck: TruthCheck;
  compact?: boolean;
  onClick?: () => void;
}

const verdictIcons = {
  true: CheckCircle,
  false: XCircle,
  unverified: HelpCircle,
  misleading: AlertTriangle,
};

export function TruthReportCard({ truthCheck, compact = false, onClick }: TruthReportCardProps) {
  const Icon = verdictIcons[truthCheck.verdict] || HelpCircle;

  if (compact) {
    return (
      <Link href={`/dashboard/truth/${truthCheck.id}`} onClick={onClick}>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] hover:bg-[--color-pulo-surface] transition-colors">
          <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', {
            'text-[--color-pulo-success]': truthCheck.verdict === 'true',
            'text-[--color-pulo-danger]': truthCheck.verdict === 'false',
            'text-[--color-pulo-muted]': truthCheck.verdict === 'unverified',
            'text-[--color-pulo-accent]': truthCheck.verdict === 'misleading',
          })} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[--color-pulo-text] line-clamp-2 mb-1">&quot;{truthCheck.claim}&quot;</p>
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={truthCheck.verdict} size="sm" />
              <span className="text-xs text-[--color-pulo-muted]">
                {Math.round(truthCheck.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Card hover={!!onClick} onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', {
              'text-[--color-pulo-success]': truthCheck.verdict === 'true',
              'text-[--color-pulo-danger]': truthCheck.verdict === 'false',
              'text-[--color-pulo-muted]': truthCheck.verdict === 'unverified',
              'text-[--color-pulo-accent]': truthCheck.verdict === 'misleading',
            })} />
            <CardTitle className="text-base">&quot;{truthCheck.claim}&quot;</CardTitle>
          </div>
          <VerdictBadge verdict={truthCheck.verdict} size="md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Confidence */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-[--color-pulo-muted]">Confidence</span>
              <span className="font-medium text-[--color-pulo-text]">{Math.round(truthCheck.confidence * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[--color-pulo-border] overflow-hidden">
              <div
                className={cn('h-full rounded-full', {
                  'bg-[--color-pulo-success]': truthCheck.confidence >= 0.8,
                  'bg-[--color-pulo-warning]': truthCheck.confidence >= 0.5 && truthCheck.confidence < 0.8,
                  'bg-[--color-pulo-danger]': truthCheck.confidence < 0.5,
                })}
                style={{ width: `${truthCheck.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Sources */}
          {truthCheck.sources.length > 0 && (
            <div>
              <span className="text-sm text-[--color-pulo-muted] mb-2 block">Sources</span>
              <div className="space-y-2">
                {truthCheck.sources.slice(0, 3).map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[--color-pulo-text] hover:text-[--color-pulo-accent] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{source.name}</span>
                    <span className="text-xs text-[--color-pulo-muted] ml-auto">
                      {Math.round(source.credibility * 100)}%
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-[--color-pulo-muted] pt-2 border-t border-[--color-pulo-border]">
            {truthCheck.caster && <span>By @{truthCheck.caster}</span>}
            <span>{formatRelativeTime(truthCheck.analyzedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
