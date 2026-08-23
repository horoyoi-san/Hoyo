import { cn } from '../../lib/utils';

export interface UptimeBarProps {
  days?: number;
  uptimePercentage?: number;
  className?: string;
}

export function UptimeBar({
  days = 40,
  uptimePercentage = 99.98,
  className,
}: UptimeBarProps) {
  const bars = Array.from({ length: days }, (_, i) => {
    // Mostly 100% operational, rare minor variance
    const isDegraded = i === 12;
    return {
      id: i,
      status: isDegraded ? 'degraded' : 'operational',
    };
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span className="font-mono text-zinc-500">{days} days ago</span>
        <span className="font-mono font-medium text-emerald-400">{uptimePercentage}% uptime</span>
        <span className="font-mono text-zinc-500">Today</span>
      </div>

      <div className="flex items-center gap-[3px] h-6">
        {bars.map((bar) => (
          <div
            key={bar.id}
            className={cn(
              'flex-1 h-full rounded-[2px] transition-all hover:opacity-80 cursor-pointer',
              bar.status === 'operational'
                ? 'bg-emerald-500/80 hover:bg-emerald-400'
                : 'bg-amber-500/80 hover:bg-amber-400'
            )}
            title={bar.status === 'operational' ? '100% Operational' : '98.5% Partial Latency Spike'}
          />
        ))}
      </div>
    </div>
  );
}
