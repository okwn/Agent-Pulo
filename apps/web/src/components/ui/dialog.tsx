'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={cn(
          'relative z-10 w-full max-w-md bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded-xl p-6 shadow-lg',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-[--color-pulo-border] transition-colors"
        >
          <X className="w-4 h-4 text-[--color-pulo-muted]" />
        </button>
        <h2 className="font-semibold text-lg text-[--color-pulo-text] mb-2">{title}</h2>
        {description && <p className="text-sm text-[--color-pulo-muted] mb-6">{description}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
