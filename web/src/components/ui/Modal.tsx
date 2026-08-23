import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { IconButton } from './IconButton';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Hide the default close button (e.g. command palette handles keys itself). */
  hideClose?: boolean;
}

export function Modal({ open, onClose, title, children, className, hideClose = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-black/60 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'card-surface rounded-xl shadow-2xl w-full max-w-lg mx-4 outline-none animate-rise',
          className
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <div className="text-xs font-semibold text-ink">{title}</div>
            {!hideClose && (
              <IconButton label="Close" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
