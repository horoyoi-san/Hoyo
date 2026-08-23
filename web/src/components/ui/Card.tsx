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
        'bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] p-5 relative overflow-hidden shadow-md shadow-black/20',
        !flat && 'transition-all duration-200 hover:bg-hz-navy-600 hover:shadow-xl hover:shadow-black/30',
        interactive && 'cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
