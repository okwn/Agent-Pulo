'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-[--color-pulo-surface] border border-[--color-pulo-border] flex items-center justify-center mb-4">
        {icon || <Package className="w-8 h-8 text-[--color-pulo-muted]" />}
      </div>
      <h3 className="font-semibold text-[--color-pulo-text] mb-2">{title}</h3>
      {description && <p className="text-sm text-[--color-pulo-muted] max-w-sm mb-4">{description}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  icon,
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl',
        'bg-[--color-pulo-danger-muted] border border-[--color-pulo-danger]/20',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[--color-pulo-surface] border border-[--color-pulo-border] flex items-center justify-center mb-4">
        {icon || (
          <svg className="w-8 h-8 text-[--color-pulo-danger]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
      <h3 className="font-semibold text-[--color-pulo-text] mb-2">{title}</h3>
      <p className="text-sm text-[--color-pulo-muted] max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'table' | 'chart';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ variant = 'card', count = 1, className }: LoadingSkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-4 rounded animate-shimmer" style={{ width: `${100 - i * 15}%` }} />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-10 rounded animate-shimmer" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 rounded animate-shimmer" />
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('flex items-end gap-2 h-32', className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t animate-shimmer"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded-xl p-5">
          <div className="h-5 w-1/3 rounded animate-shimmer mb-3" />
          <div className="h-4 w-2/3 rounded animate-shimmer mb-2" />
          <div className="h-4 w-1/2 rounded animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
