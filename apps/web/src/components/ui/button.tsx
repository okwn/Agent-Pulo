'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[--color-pulo-bg]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        {
          primary: 'bg-[--color-pulo-accent] hover:bg-[--color-pulo-accent-hover] text-white focus:ring-[--color-pulo-accent]',
          secondary: 'bg-[--color-pulo-surface] hover:bg-[--color-pulo-surface-hover] text-[--color-pulo-text] border border-[--color-pulo-border] focus:ring-[--color-pulo-border]',
          ghost: 'hover:bg-[--color-pulo-surface] text-[--color-pulo-muted] hover:text-[--color-pulo-text] focus:ring-[--color-pulo-border]',
          danger: 'bg-[--color-pulo-danger] hover:bg-[--color-pulo-danger]/90 text-white focus:ring-[--color-pulo-danger]',
        }[variant],
        {
          sm: 'px-3 py-1.5 text-xs',
          md: 'px-4 py-2 text-sm',
          lg: 'px-6 py-3 text-base',
        }[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
