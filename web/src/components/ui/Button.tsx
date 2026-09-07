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
      'inline-flex flex-row items-center justify-center whitespace-nowrap shrink-0 font-medium rounded-xl transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none leading-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-white hover:bg-zinc-200 text-zinc-950 font-semibold shadow-sm border border-transparent active:scale-[0.98]',
      emerald:
        'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-medium border border-emerald-800/50 shadow-sm active:scale-[0.98]',
      secondary:
        'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 shadow-sm active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-700/60 active:scale-[0.98]',
      destructive:
        'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 font-medium active:scale-[0.98]',
      ghost: 'bg-transparent hover:bg-zinc-800/60 text-zinc-400 hover:text-white',
      gold:
        'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 font-medium active:scale-[0.98]',
    };

    const sizes = {
      xs: 'px-2.5 py-1 text-xs gap-1.5 h-7',
      sm: 'px-3.5 py-1.5 text-xs gap-1.5 h-8',
      md: 'px-4 py-2 text-xs gap-2 h-9',
      lg: 'px-5 py-2.5 text-sm gap-2 h-10',
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
