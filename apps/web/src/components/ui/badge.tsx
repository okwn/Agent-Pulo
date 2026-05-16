'use client';

import { cn } from '@/lib/utils';
import type { SystemStatus, RiskLevel, Verdict, PlanTier } from '@/lib/mock-data';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        {
          default: 'bg-[--color-pulo-surface] text-[--color-pulo-muted] border border-[--color-pulo-border]',
          success: 'bg-[--color-pulo-success-muted] text-[--color-pulo-success] border border-[--color-pulo-success]/20',
          warning: 'bg-[--color-pulo-warning-muted] text-[--color-pulo-warning] border border-[--color-pulo-warning]/20',
          danger: 'bg-[--color-pulo-danger-muted] text-[--color-pulo-danger] border border-[--color-pulo-danger]/20',
          info: 'bg-[--color-pulo-info-muted] text-[--color-pulo-info] border border-[--color-pulo-info]/20',
          accent: 'bg-[--color-pulo-accent-muted] text-[--color-pulo-accent] border border-[--color-pulo-accent]/20',
        }[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: SystemStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const statusConfig: Record<SystemStatus, { label: string; color: 'success' | 'warning' | 'danger' | 'default' }> = {
  operational: { label: 'Operational', color: 'success' },
  degraded: { label: 'Degraded', color: 'warning' },
  down: { label: 'Down', color: 'danger' },
  unknown: { label: 'Unknown', color: 'default' },
};

export function StatusBadge({ status, size = 'sm', showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.color} size={size}>
      <span
        className={cn(
          'rounded-full',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          {
            success: 'bg-[--color-pulo-success]',
            warning: 'bg-[--color-pulo-warning]',
            danger: 'bg-[--color-pulo-danger]',
            default: 'bg-[--color-pulo-muted]',
          }[config.color]
        )}
      />
      {showLabel && config.label}
    </Badge>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const riskConfig: Record<RiskLevel, { label: string; color: 'success' | 'warning' | 'danger' | 'default' }> = {
  low: { label: 'Low', color: 'success' },
  medium: { label: 'Medium', color: 'warning' },
  high: { label: 'High', color: 'danger' },
  critical: { label: 'Critical', color: 'danger' },
};

export function RiskBadge({ level, size = 'sm', showLabel = true }: RiskBadgeProps) {
  const config = riskConfig[level];
  return (
    <Badge variant={config.color} size={size}>
      {showLabel && config.label}
    </Badge>
  );
}

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const verdictConfig: Record<Verdict, { label: string; color: 'success' | 'danger' | 'default' | 'accent' }> = {
  true: { label: 'True', color: 'success' },
  false: { label: 'False', color: 'danger' },
  unverified: { label: 'Unverified', color: 'default' },
  misleading: { label: 'Misleading', color: 'accent' },
};

export function VerdictBadge({ verdict, size = 'sm', showLabel = true }: VerdictBadgeProps) {
  const config = verdictConfig[verdict];
  return (
    <Badge variant={config.color} size={size}>
      {showLabel && config.label}
    </Badge>
  );
}

interface PlanBadgeProps {
  plan: PlanTier;
  size?: 'sm' | 'md';
}

const planConfig: Record<PlanTier, { label: string; color: 'default' | 'accent' | 'info' | 'warning' }> = {
  free: { label: 'Free', color: 'default' },
  pro: { label: 'Pro', color: 'accent' },
  creator: { label: 'Creator', color: 'info' },
  community: { label: 'Community', color: 'warning' },
  admin: { label: 'Admin', color: 'warning' },
};

export function PlanBadge({ plan, size = 'sm' }: PlanBadgeProps) {
  const config = planConfig[plan];
  return (
    <Badge variant={config.color} size={size}>
      {config.label}
    </Badge>
  );
}
