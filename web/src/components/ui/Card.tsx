import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  /** Disable the default hover border lift (static container card). */
  flat?: boolean;
}

export function Card({ className, interactive = false, flat = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-hz-navy-700 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 relative shadow-md shadow-black/30',
        !flat && 'transition-all duration-200 hover:border-zinc-700 hover:bg-hz-navy-600/90 hover:shadow-xl hover:shadow-black/40',
        interactive && 'cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
