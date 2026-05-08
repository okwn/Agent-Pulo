'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border text-[--color-pulo-text]',
          'placeholder:text-[--color-pulo-muted]',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[--color-pulo-bg]',
          'transition-colors',
          error
            ? 'border-[--color-pulo-danger] focus:ring-[--color-pulo-danger]'
            : 'border-[--color-pulo-border] focus:border-[--color-pulo-accent] focus:ring-[--color-pulo-accent]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border text-[--color-pulo-text]',
          'placeholder:text-[--color-pulo-muted]',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[--color-pulo-bg]',
          'transition-colors resize-none',
          error
            ? 'border-[--color-pulo-danger] focus:ring-[--color-pulo-danger]'
            : 'border-[--color-pulo-border] focus:border-[--color-pulo-accent] focus:ring-[--color-pulo-accent]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
