'use client';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, hover = false, padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded-xl',
        hover && 'hover:border-[--color-pulo-border-light] transition-colors cursor-pointer',
        {
          none: '',
          sm: 'p-4',
          md: 'p-5',
          lg: 'p-6',
        }[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('font-semibold text-[--color-pulo-text]', className)} {...props}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-[--color-pulo-muted]', className)} {...props}>
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-[--color-pulo-border]', className)} {...props}>
      {children}
    </div>
  );
}
