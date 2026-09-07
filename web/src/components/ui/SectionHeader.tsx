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
    <div className={cn('flex items-start justify-between gap-3.5 pb-3 border-b border-hairline', className)}>
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-white/5 border border-accent/25 text-accent-soft shadow-[0_0_16px_-6px_rgb(161_161_170/0.3)]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-white tracking-tight leading-snug">{titlePart}</h1>
            {badge}
          </div>
          {description && <p className="mt-0.5 text-xs text-ink-3 font-normal leading-relaxed">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
