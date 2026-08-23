import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** Right-aligned trailing content (badges, timestamps). */
  trailing?: React.ReactNode;
}

/**
 * Keyboard-accessible list row used by packet/asset/log lists: a real
 * <button> with standardized hover / selected / focus states.
 */
export const SelectRow = React.forwardRef<HTMLButtonElement, SelectRowProps>(
  ({ className, selected = false, trailing, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={cn(
          'w-full text-left px-3 py-2 flex items-center gap-3 transition-colors duration-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset',
          selected
            ? 'bg-accent/15 border-l-2 border-accent'
            : 'border-l-2 border-transparent hover:bg-white/[0.03]',
          className
        )}
        {...props}
      >
        {children}
        {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
      </button>
    );
  }
);

SelectRow.displayName = 'SelectRow';
