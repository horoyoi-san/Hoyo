import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  /** Leading decorative icon (e.g. search). */
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error = false, icon, ...props }, ref) => {
    return (
      <div className={cn('relative w-full', icon && 'flex items-center')}>
        {icon && (
          <span className="absolute left-2.5 text-ink-3 pointer-events-none" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          aria-invalid={error || undefined}
          className={cn(
            'w-full px-3.5 py-1.5 rounded-xl bg-zinc-950 border text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 transition-all duration-150 font-sans shadow-inner',
            error ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/40' : 'border-zinc-800 focus:border-zinc-400',
            icon && 'pl-8',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
