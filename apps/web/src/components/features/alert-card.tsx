'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { RiskBadge } from '@/components/ui/badge';
import type { Alert } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { AlertTriangle, Bell, MessageCircle, Shield, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
  onClick?: () => void;
}

const alertIcons = {
  trend: TrendingUp,
  safety: AlertTriangle,
  mention: MessageCircle,
  system: Zap,
  billing: Bell,
};

export function AlertCard({ alert, compact = false, onClick }: AlertCardProps) {
  const Icon = alertIcons[alert.type] || Bell;

  const severityBorderColor = {
    low: 'border-l-[--color-pulo-success]',
    medium: 'border-l-[--color-pulo-warning]',
    high: 'border-l-[--color-pulo-danger]',
    critical: 'border-l-[--color-pulo-danger]',
  }[alert.severity];

  if (compact) {
    return (
      <Link href={alert.actionUrl || '#'} onClick={onClick}>
        <div
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] border-l-2 hover:bg-[--color-pulo-surface] transition-colors',
            severityBorderColor
          )}
        >
          <Icon className={cn('w-4 h-4 mt-0.5', {
            'text-[--color-pulo-success]': alert.severity === 'low',
            'text-[--color-pulo-warning]': alert.severity === 'medium',
            'text-[--color-pulo-danger]': alert.severity === 'high' || alert.severity === 'critical',
          })} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[--color-pulo-text] truncate">{alert.title}</span>
              {!alert.read && (
                <span className="w-2 h-2 rounded-full bg-[--color-pulo-accent] flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-[--color-pulo-muted]">{formatRelativeTime(alert.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Card hover={!!onClick} onClick={onClick} className={cn('border-l-2', severityBorderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-[--color-pulo-bg]', {
            'text-[--color-pulo-success]': alert.severity === 'low',
            'text-[--color-pulo-warning]': alert.severity === 'medium',
            'text-[--color-pulo-danger]': alert.severity === 'high' || alert.severity === 'critical',
          })}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[--color-pulo-text]">{alert.title}</span>
              <RiskBadge level={alert.severity} size="sm" />
            </div>
            <p className="text-sm text-[--color-pulo-muted] line-clamp-2">{alert.description}</p>
            <span className="text-xs text-[--color-pulo-muted] mt-2 block">{formatRelativeTime(alert.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
