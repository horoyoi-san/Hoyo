import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  /** Part of the title rendered with the aurora gradient — must appear inside title. */
  gradientWord?: string;
  badge?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Hero-style page header: big Kanit display title with an optional
 * gradient-highlighted word (Kanit renders both Thai + Latin).
 */
export function SectionHeader({
  icon,
  title,
  gradientWord,
  badge,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  const titlePart =
    gradientWord && title.includes(gradientWord) ? (
      <>
        {title.slice(0, title.indexOf(gradientWord))}
        <span className="text-gradient">{gradientWord}</span>
        {title.slice(title.indexOf(gradientWord) + gradientWord.length)}
      </>
    ) : (
      title
    );

  return (
    <div className={cn('flex items-start justify-between gap-4 pb-5 border-b border-hairline', className)}>
      <div className="flex items-start gap-4 min-w-0">
        {icon && (
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-aurora/10 border border-accent/25 text-accent-soft shadow-[0_0_24px_-8px_rgb(139_92_246/0.5)]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{titlePart}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 text-xs text-ink-3 font-light">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
