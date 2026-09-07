import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * Premium Segmented tab control with zero clipping, clean spacing, and keyboard accessibility.
 */
export function Tabs<T extends string>({ items, value, onChange, className, ...props }: TabsProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else return;

    e.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].value);
  };

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center p-1 rounded-xl bg-zinc-950 border border-zinc-800 gap-1 shrink-0 overflow-x-auto select-none scrollbar-none',
        className
      )}
      {...props}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50',
              selected
                ? 'bg-zinc-800 text-white border border-zinc-700/70 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium',
                  selected ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-500'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
