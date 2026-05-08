'use client';

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Badge } from './badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Trend } from '@/lib/mock-data';

interface TrendCardProps {
  trend: Trend;
  onClick?: () => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  airdrop: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  grant: 'bg-green-500/20 text-green-400 border-green-500/30',
  reward: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  program: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  news: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  hack: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TrendCard({ trend, onClick, className }: TrendCardProps) {
  const velocityIcon = trend.velocity > 100 ? TrendingUp : trend.velocity > 50 ? Minus : TrendingDown;
  const VelocityIcon = velocityIcon;

  const sparkline = trend.sparkline || [];
  const maxVal = Math.max(...sparkline, 1);
  const minVal = Math.min(...sparkline, 0);
  const range = maxVal - minVal || 1;

  return (
    <Card
      hover={!!onClick}
      onClick={onClick}
      className={cn('relative overflow-hidden', className)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <span
            className={cn(
              'inline-block px-2 py-0.5 text-xs rounded border mb-2',
              categoryColors[trend.category] || categoryColors.news
            )}
          >
            {trend.category}
          </span>
          <CardTitle className="text-base leading-tight">{trend.title}</CardTitle>
        </div>
        <div className="flex items-center gap-1 text-[--color-pulo-muted]">
          <VelocityIcon className="w-4 h-4" />
          <span className="text-xs font-medium">{trend.velocity}</span>
        </div>
      </div>

      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-[--color-pulo-muted]">
              <span className="font-medium text-[--color-pulo-text]">{trend.mentions.toLocaleString()}</span> mentions
            </span>
            <span className="text-[--color-pulo-muted]">
              <span className="font-medium text-[--color-pulo-text]">{trend.sources}</span> sources
            </span>
          </div>
        </div>

        {sparkline.length > 0 && (
          <div className="mt-4 flex items-end gap-1 h-10">
            {sparkline.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[--color-pulo-accent]/30"
                style={{ height: `${((val - minVal) / range) * 100}%` }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UsageLimitMeterProps {
  used: number;
  limit: number;
  label?: string;
  unit?: string;
  className?: string;
}

export function UsageLimitMeter({ used, limit, label, unit = '', className }: UsageLimitMeterProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isOver = used > limit;
  const isWarning = percentage > 80 && !isOver;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[--color-pulo-muted]">{label}</span>
          <span className={cn('font-medium', isOver ? 'text-[--color-pulo-danger]' : isWarning ? 'text-[--color-pulo-warning]' : 'text-[--color-pulo-text]')}>
            {used.toLocaleString()}{limit > 0 ? `/${limit.toLocaleString()}` : ''} {unit}
          </span>
        </div>
      )}
      <div className="h-2 rounded-full bg-[--color-pulo-border] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isOver ? 'bg-[--color-pulo-danger]' : isWarning ? 'bg-[--color-pulo-warning]' : 'bg-[--color-pulo-accent]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, width = 100, height = 32, className }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={cn(className)}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-pulo-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
