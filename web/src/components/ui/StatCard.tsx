import React from 'react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  /** Accent tint for the icon chip. */
  tone?: 'violet' | 'emerald' | 'amber' | 'gold' | 'rose' | 'neutral';
  className?: string;
}

const tones = {
  violet: 'bg-accent/15 border-accent/30 text-accent-soft shadow-[0_0_20px_-8px_rgb(139_92_246/0.6)]',
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_-8px_rgb(16_185_129/0.5)]',
  amber: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  gold: 'bg-gold/15 border-gold/35 text-gold shadow-[0_0_20px_-8px_rgb(230_195_106/0.5)]',
  rose: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  neutral: 'bg-white/[0.06] border-edge text-ink-2',
};

export function StatCard({ label, value, sub, icon, tone = 'violet', className }: StatCardProps) {
  return (
    <div className={cn('card-surface card-hover rounded-2xl p-4 flex items-start gap-3.5', className)}>
      {icon && (
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', tones[tone])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-3">{label}</div>
        <div className="mt-0.5 text-xl font-bold font-mono text-ink tabular-nums truncate">{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-ink-3 font-light truncate">{sub}</div>}
      </div>
    </div>
  );
}
