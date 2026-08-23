import React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Honest empty / demo-data placeholder — replaces fake "success" theatrics. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-12 px-6 text-center animate-fade-in',
        className
      )}
    >
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-3 border border-edge text-ink-3">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-ink">{title}</div>
      {description && <div className="text-xs text-ink-3 max-w-sm leading-relaxed">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
