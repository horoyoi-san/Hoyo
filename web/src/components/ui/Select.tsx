import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
}

/** Styled native <select> — keyboard accessible out of the box. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, error = false, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none px-3 py-1.5 pr-8 rounded-lg bg-inset border text-xs text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150 cursor-pointer',
            error ? 'border-rose-500/50' : 'border-edge',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface-2 text-ink">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = 'Select';
