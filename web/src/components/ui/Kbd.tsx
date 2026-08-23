import React from 'react';
import { cn } from '../../lib/utils';

/** Keyboard key chip, e.g. <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded border border-edge-strong bg-surface-3 font-mono text-[10px] font-medium text-ink-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]',
        className
      )}
    >
      {children}
    </kbd>
  );
}
