import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'violet' | 'amber' | 'rose' | 'gold' | 'neutral' | 'outline';
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
    emerald: 'bg-hz-green-400/10 text-hz-green-400 border-hz-green-400/25',
    violet: 'bg-hz-brand-400/10 text-hz-brand-300 border-hz-brand-400/25',
    amber: 'bg-hz-orange-400/10 text-hz-orange-400 border-hz-orange-400/25',
    rose: 'bg-hz-red-400/10 text-hz-red-400 border-hz-red-400/25',
    gold: 'bg-hz-orange-400/10 text-hz-orange-400 border-hz-orange-400/25',
    neutral: 'bg-hz-navy-700 text-hz-gray-400 border-hz-navy-500',
    outline: 'bg-transparent text-hz-gray-400 border-hz-navy-500',
  };

  const dotColors = {
    emerald: 'bg-hz-green-400',
    violet: 'bg-hz-brand-400',
    amber: 'bg-hz-orange-400',
    rose: 'bg-hz-red-400',
    gold: 'bg-hz-orange-400',
    neutral: 'bg-hz-gray-500',
    outline: 'bg-hz-navy-500',
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
