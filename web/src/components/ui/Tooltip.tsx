import React from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'right';
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight CSS-only tooltip — visible on hover and on keyboard focus
 * (child must be focusable for the focus path to trigger).
 */
export function Tooltip({ content, side = 'top', children, className }: TooltipProps) {
  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-edge-strong bg-surface-3 px-2 py-1 text-[11px] text-ink shadow-lg opacity-0 translate-y-0.5 transition-all duration-150',
          'group-hover/tt:opacity-100 group-hover/tt:translate-y-0 group-focus-within/tt:opacity-100 group-focus-within/tt:translate-y-0',
          sideClasses[side]
        )}
      >
        {content}
      </span>
    </span>
  );
}
