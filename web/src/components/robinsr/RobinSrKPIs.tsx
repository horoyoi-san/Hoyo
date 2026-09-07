import { Radio, Server, Cpu, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RobinSrKPIsProps {
  dispatchPort: string | number;
  gameserverPort: string | number;
  serverOn: boolean;
  dumpStatus: { synced: boolean; opcodesCount: number; pairedRoutes: number };
  patchReady: boolean | undefined;
}

export function RobinSrKPIs({
  dispatchPort,
  gameserverPort,
  serverOn,
  dumpStatus,
  patchReady,
}: RobinSrKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
      {/* Card 1: HTTP Dispatch Server */}
      <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
        <div className={cn(
          'p-3 rounded-xl border shrink-0',
          serverOn
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400 shadow-sm'
            : 'bg-zinc-800 border-zinc-700/60 text-zinc-300'
        )}>
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            HTTP Dispatch
          </div>
          <div className="text-sm font-bold text-white font-mono truncate">
            Port :{dispatchPort}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', serverOn ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600')} />
            <span className={cn('text-[11px] font-semibold', serverOn ? 'text-emerald-400' : 'text-zinc-500')}>
              {serverOn ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: KCP Gameserver */}
      <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
        <div className={cn(
          'p-3 rounded-xl border shrink-0',
          serverOn
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400 shadow-sm'
            : 'bg-zinc-800 border-zinc-700/60 text-zinc-300'
        )}>
          <Server className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            KCP Gameserver
          </div>
          <div className="text-sm font-bold text-white font-mono truncate">
            UDP :{gameserverPort}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', serverOn ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600')} />
            <span className={cn('text-[11px] font-semibold', serverOn ? 'text-emerald-400' : 'text-zinc-500')}>
              {serverOn ? 'READY' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Dynamic Opcodes */}
      <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
        <div className={cn(
          'p-3 rounded-xl border shrink-0',
          dumpStatus.synced
            ? 'bg-zinc-800 border-zinc-700/80 text-zinc-200 shadow-sm'
            : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400'
        )}>
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Opcode Schema
          </div>
          <div className="text-sm font-bold text-white font-mono truncate">
            {dumpStatus.synced ? `${dumpStatus.opcodesCount} Opcodes` : 'Auto-Detect'}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate">
            {dumpStatus.synced ? `${dumpStatus.pairedRoutes} Active Routes` : 'packetIds.json'}
          </div>
        </div>
      </div>

      {/* Card 4: Game Patch Status */}
      <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
        <div className={cn(
          'p-3 rounded-xl border shrink-0',
          patchReady
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400 shadow-sm'
            : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
        )}>
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Client Redirect
          </div>
          <div className="text-sm font-bold text-white font-mono truncate">
            hkrpg.dll & launcher
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {patchReady ? (
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> READY
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> NOT INSTALLED
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
