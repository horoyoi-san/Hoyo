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
      <div className="bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] p-4 flex items-center gap-3.5 shadow-md shadow-black/20">
        <div className={cn(
          'p-3 rounded-[16px] shrink-0',
          serverOn ? 'bg-hz-green-400/15 text-hz-green-400' : 'bg-hz-navy-600 text-hz-gray-400'
        )}>
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-hz-gray-400 uppercase tracking-wider">
            HTTP Dispatch
          </div>
          <div className="text-sm font-bold text-white truncate">
            Port :{dispatchPort}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('h-2 w-2 rounded-full', serverOn ? 'bg-hz-green-400 animate-pulse' : 'bg-zinc-500')} />
            <span className={cn('text-[11px] font-semibold', serverOn ? 'text-hz-green-400' : 'text-zinc-400')}>
              {serverOn ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: KCP Gameserver */}
      <div className="bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] p-4 flex items-center gap-3.5 shadow-md shadow-black/20">
        <div className={cn(
          'p-3 rounded-[16px] shrink-0',
          serverOn ? 'bg-hz-brand-400/15 text-hz-brand-300' : 'bg-hz-navy-600 text-hz-gray-400'
        )}>
          <Server className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-hz-gray-400 uppercase tracking-wider">
            KCP Gameserver
          </div>
          <div className="text-sm font-bold text-white truncate">
            UDP :{gameserverPort}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('h-2 w-2 rounded-full', serverOn ? 'bg-hz-brand-400 animate-pulse' : 'bg-zinc-500')} />
            <span className={cn('text-[11px] font-semibold', serverOn ? 'text-hz-brand-300' : 'text-zinc-400')}>
              {serverOn ? 'READY' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Dynamic Opcodes */}
      <div className="bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] p-4 flex items-center gap-3.5 shadow-md shadow-black/20">
        <div className={cn(
          'p-3 rounded-[16px] shrink-0',
          dumpStatus.synced ? 'bg-hz-orange-400/15 text-hz-orange-400' : 'bg-hz-navy-600 text-hz-gray-400'
        )}>
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-hz-gray-400 uppercase tracking-wider">
            Opcode Schema
          </div>
          <div className="text-sm font-bold text-white truncate">
            {dumpStatus.synced ? `${dumpStatus.opcodesCount} Opcodes` : 'Auto-Detect'}
          </div>
          <div className="text-[11px] text-hz-gray-400 truncate">
            {dumpStatus.synced ? `${dumpStatus.pairedRoutes} Active Routes` : 'packetIds.json'}
          </div>
        </div>
      </div>

      {/* Card 4: Game Patch Status */}
      <div className="bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] p-4 flex items-center gap-3.5 shadow-md shadow-black/20">
        <div className={cn(
          'p-3 rounded-[16px] shrink-0',
          patchReady ? 'bg-hz-green-400/15 text-hz-green-400' : 'bg-hz-orange-400/15 text-hz-orange-400'
        )}>
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-hz-gray-400 uppercase tracking-wider">
            Client Redirect
          </div>
          <div className="text-sm font-bold text-white truncate">
            hkrpg.dll & launcher
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {patchReady ? (
              <span className="text-[11px] font-semibold text-hz-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> READY
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-hz-orange-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> MISSING
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
