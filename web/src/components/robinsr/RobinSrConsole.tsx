import { Terminal, Copy, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { ConsoleTab, LogMessage } from './types';
import { RefObject } from 'react';

interface RobinSrConsoleProps {
  activeTab: ConsoleTab;
  setActiveTab: (t: ConsoleTab) => void;
  tabCounts: Record<ConsoleTab, number>;
  filteredLogs: LogMessage[];
  logs: LogMessage[];
  dispatchPort: string | number;
  gameserverPort: string | number;
  handleCopyLogs: () => void;
  clearLogs: () => void;
  copied: boolean;
  terminalEndRef: RefObject<HTMLDivElement | null>;
}

export function RobinSrConsole({
  activeTab,
  setActiveTab,
  tabCounts,
  filteredLogs,
  logs,
  dispatchPort,
  gameserverPort,
  handleCopyLogs,
  clearLogs,
  copied,
  terminalEndRef,
}: RobinSrConsoleProps) {
  return (
    <div className="flex-1 min-h-[300px] flex flex-col bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] overflow-hidden shadow-lg shadow-black/25">
      {/* Console Tabs Header */}
      <div className="h-11 px-4 border-b border-hz-navy-500/40 bg-hz-navy-800/90 flex items-center justify-between shrink-0">
        {/* Window Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 mr-2 text-xs font-bold text-white shrink-0">
            <Terminal className="h-4 w-4 text-hz-green-400" />
            <span>Console</span>
          </div>

          {(['ALL', 'SERVER', 'DUMP', 'PATCH', 'LAUNCH'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none',
                  isActive
                    ? 'bg-hz-brand-400 text-white font-bold shadow-md shadow-hz-brand-400/25'
                    : 'text-hz-gray-400 hover:text-white hover:bg-hz-navy-600'
                )}
              >
                <span>{tab}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  isActive ? 'bg-white/20 text-white' : 'bg-hz-navy-900 text-hz-gray-500'
                )}>
                  {tabCounts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="xs" onClick={handleCopyLogs} icon={<Copy className="h-3 w-3 text-hz-gray-400" />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="xs" onClick={clearLogs} icon={<Trash2 className="h-3 w-3 text-hz-gray-400" />}>
            Clear
          </Button>
        </div>
      </div>

      {/* Console Log Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs select-text scrollbar-thin bg-hz-navy-900/90">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-hz-gray-500 py-12">
            <Terminal className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No events logged in [{activeTab}] stream</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.level === 'error';
            const isSuccess = log.level === 'success';
            const isProcess = log.level === 'process';

            return (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-white/[0.02] px-2 py-0.5 rounded-lg transition-colors">
                <span className="text-hz-gray-500 select-none text-[11px] shrink-0">[{log.time}]</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase select-none shrink-0 border',
                    log.tag === 'SERVER' && 'bg-hz-brand-400/15 text-hz-brand-300 border-hz-brand-400/25',
                    log.tag === 'DUMP' && 'bg-hz-orange-400/15 text-hz-orange-400 border-hz-orange-400/25',
                    log.tag === 'PATCH' && 'bg-hz-brand-400/15 text-hz-brand-300 border-hz-brand-400/25',
                    log.tag === 'LAUNCH' && 'bg-hz-green-400/15 text-hz-green-400 border-hz-green-400/25',
                    log.tag === 'SYSTEM' && 'bg-hz-navy-700 text-hz-gray-400 border-hz-navy-500'
                  )}
                >
                  {log.tag}
                </span>
                <span
                  className={cn(
                    'break-all font-mono',
                    isError && 'text-hz-red-400 font-semibold',
                    isSuccess && 'text-hz-green-400',
                    isProcess && 'text-hz-orange-400',
                    !isError && !isSuccess && !isProcess && 'text-hz-gray-400'
                  )}
                >
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Console Footer Status */}
      <div className="h-8 px-4 border-t border-hz-navy-500/40 bg-hz-navy-800/80 flex items-center justify-between text-[11px] text-hz-gray-400 font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span>ACTIVE TAB: <strong className="text-white">{activeTab}</strong></span>
          <span>HTTP: <strong className="text-white">:{dispatchPort}</strong></span>
          <span>KCP: <strong className="text-white">:{gameserverPort}</strong></span>
        </div>
        <div>
          {filteredLogs.length} OF {logs.length} EVENTS
        </div>
      </div>
    </div>
  );
}
