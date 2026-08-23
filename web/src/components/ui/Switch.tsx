import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Switch({ checked, onCheckedChange, disabled = false, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'w-9 h-5 rounded-full transition-colors duration-200 relative inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        checked ? 'bg-accent-strong border-accent' : 'bg-surface-3 border-edge',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 transform shadow-sm',
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
