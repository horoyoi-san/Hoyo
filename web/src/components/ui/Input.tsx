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
            'w-full px-3.5 py-1.5 rounded-[14px] bg-hz-navy-900 border text-xs text-white placeholder:text-hz-gray-500 focus:outline-none focus:border-hz-brand-400 focus:ring-1 focus:ring-hz-brand-400 transition-all duration-150 font-sans shadow-inner',
            error ? 'border-hz-red-400/50 focus:border-hz-red-400 focus:ring-hz-red-400/60' : 'border-hz-navy-500',
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
