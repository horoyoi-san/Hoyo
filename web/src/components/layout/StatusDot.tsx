import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { cn } from '../../lib/utils';

export function StatusDot({ compact = false }: { compact?: boolean }) {
  const backendConnected = useAppStore((state) => state.backendConnected);
  const serverRunning = useAppStore((state) => state.serverRunning);
  const { isTh } = useT();

  const statusLabel = serverRunning
    ? (isTh ? 'RobinSR รันอยู่ (:21000)' : 'RobinSR Active (:21000)')
    : backendConnected
    ? (isTh ? 'AstralOS พร้อมใช้งาน' : 'AstralOS Ready')
    : (isTh ? 'สแตนด์บาย' : 'Standby');

  const isGreen = backendConnected || serverRunning;

  if (compact) {
    return (
      <div className="flex justify-center" title={statusLabel}>
        <span className="relative flex h-2.5 w-2.5">
          {serverRunning && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={cn(
              'relative inline-flex rounded-full h-2.5 w-2.5',
              isGreen ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-ink-4'
            )}
          />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-inset border border-edge text-xs">
      <span className="relative flex h-2.5 w-2.5">
        {serverRunning && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2.5 w-2.5',
            isGreen ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-ink-4'
          )}
        />
      </span>
      <span className={isGreen ? 'text-emerald-400 font-medium truncate' : 'text-ink-3 font-normal truncate'}>
        {statusLabel}
      </span>
    </div>
  );
}
