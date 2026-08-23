import React from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'gold';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Shows a spinner and disables interaction while true. */
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'secondary', size = 'sm', loading = false, icon, iconRight, children, disabled, ...props },
    ref
  ) => {
    const baseStyles =
      'inline-flex flex-row items-center justify-center whitespace-nowrap shrink-0 font-medium rounded-[14px] transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hz-brand-400/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none leading-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-hz-brand-400 hover:bg-hz-brand-500 text-white font-medium shadow-md shadow-hz-brand-400/25',
      emerald:
        'bg-hz-green-400 hover:bg-emerald-500 text-white font-medium shadow-md shadow-hz-green-400/25',
      secondary:
        'bg-hz-navy-700 hover:bg-hz-navy-600 text-white border border-hz-navy-500 shadow-sm',
      outline:
        'bg-transparent hover:bg-hz-navy-700 text-hz-gray-400 hover:text-white border border-hz-navy-500',
      destructive:
        'bg-hz-red-400/15 hover:bg-hz-red-400/25 text-rose-300 border border-hz-red-400/30',
      ghost: 'bg-transparent hover:bg-hz-navy-700 text-hz-gray-400 hover:text-white',
      gold:
        'bg-hz-orange-400/15 hover:bg-hz-orange-400/25 text-amber-300 border border-hz-orange-400/30 font-medium',
    };

    const sizes = {
      xs: 'px-2.5 py-1 text-xs gap-1.5 h-6.5',
      sm: 'px-3.5 py-1.5 text-xs gap-1.5 h-7.5',
      md: 'px-4 py-2 text-xs gap-2 h-8.5',
      lg: 'px-5 py-2.5 text-sm gap-2 h-9.5',
      xl: 'px-6 py-3 text-sm gap-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Spinner className="h-3.5 w-3.5 shrink-0" />}
        {!loading && icon && <span className="shrink-0 flex items-center">{icon}</span>}
        {children}
        {iconRight && <span className="shrink-0 flex items-center">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
