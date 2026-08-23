import React from 'react';
import { cn } from '../../lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (icon-only button). */
  label: string;
  variant?: 'default' | 'ghost' | 'active';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'border border-hz-navy-500 bg-hz-navy-700 hover:bg-hz-navy-600 text-hz-gray-400 hover:text-white shadow-sm',
      ghost: 'border border-transparent bg-transparent hover:bg-hz-navy-700 text-hz-gray-400 hover:text-white',
      active: 'border border-hz-brand-400/50 bg-hz-brand-400/20 text-hz-brand-300',
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
