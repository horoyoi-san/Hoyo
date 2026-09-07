import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'violet' | 'blue' | 'amber' | 'rose' | 'gold' | 'neutral' | 'outline';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    emerald: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
    violet: 'bg-zinc-800 text-zinc-200 border-zinc-700/60',
    blue: 'bg-zinc-800 text-zinc-200 border-zinc-700/60',
    amber: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
    rose: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
    gold: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
    neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
    outline: 'bg-transparent text-zinc-400 border-zinc-800',
  };

  const dotColors = {
    emerald: 'bg-emerald-400',
    violet: 'bg-zinc-400',
    blue: 'bg-zinc-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    gold: 'bg-amber-400',
    neutral: 'bg-zinc-500',
    outline: 'bg-zinc-600',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border select-none leading-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('inline-block rounded-full h-1.5 w-1.5 shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
