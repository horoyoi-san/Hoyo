import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Download, Pause, Play, SlidersHorizontal, Terminal, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, SectionHeader } from '../ui';
import { useLogStore } from '../../stores/useLogStore';
import { useT, useDebouncedValue } from '../../lib/hooks';
import { downloadTextFile, formatTime } from '../../lib/utils';
import { LogLevel } from '../../lib/types';
import { cn } from '../../lib/utils';

const LEVELS: Array<LogLevel | 'all'> = ['all', 'info', 'warn', 'error', 'debug', 'trace'];

const levelStyles: Record<string, string> = {
  error: 'bg-hz-red-400/15 text-hz-red-400 border border-hz-red-400/30',
  warn: 'bg-hz-orange-400/15 text-hz-orange-400 border border-hz-orange-400/30',
  info: 'bg-hz-green-400/15 text-hz-green-400 border border-hz-green-400/30',
  debug: 'bg-hz-navy-700 text-hz-gray-400 border border-hz-navy-500',
  trace: 'bg-hz-navy-700 text-hz-gray-500 border border-hz-navy-500',
};

export function ConsoleView() {
  const { t, isTh } = useT();

  const logs = useLogStore((state) => state.logs);
  const paused = useLogStore((state) => state.paused);
  const setPaused = useLogStore((state) => state.setPaused);
  const clearLogs = useLogStore((state) => state.clearLogs);
  const selectedLevel = useLogStore((state) => state.selectedLevel);
  const setSelectedLevel = useLogStore((state) => state.setSelectedLevel);
  const searchFilter = useLogStore((state) => state.searchFilter);
  const setSearchFilter = useLogStore((state) => state.setSearchFilter);

  const debouncedSearch = useDebouncedValue(searchFilter, 150);
  const needle = debouncedSearch.trim().toLowerCase();

  const filteredLogs = useMemo(() => {
    if (selectedLevel === 'all' && !needle) return logs;
    return logs.filter((log) => {
      if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
      if (!needle) return true;
      return (
        log.message.toLowerCase().includes(needle) || log.target.toLowerCase().includes(needle)
      );
    });
  }, [logs, selectedLevel, needle]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  /* Auto-scroll: follow new logs while the user hasn't scrolled up. */
  useEffect(() => {
    if (paused || !stickToBottom.current || filteredLogs.length === 0) return;
    virtualizer.scrollToIndex(filteredLogs.length - 1, { align: 'end' });
  }, [filteredLogs.length, paused, virtualizer]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const handleExport = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `${new Date(log.timestamp_ms).toISOString()} [${log.level.toUpperCase()}] [${log.target}] ${log.message}`
      )
      .join('\n');
    downloadTextFile(`astral-os-console-${Date.now()}.log`, content);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-hidden bg-hz-navy-900">
      <SectionHeader
        icon={<Terminal className="h-5 w-5 text-hz-brand-400" />}
        title={t('console.title')}
        badge={
          <Badge variant={paused ? 'neutral' : 'emerald'} dot={!paused}>
            {paused ? t('status.idle') : t('status.live')}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={paused ? 'emerald' : 'secondary'}
              size="sm"
              onClick={() => setPaused(!paused)}
              icon={paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            >
              {paused ? t('btn.resume') : t('btn.pause')}
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs} icon={<Trash2 className="h-3.5 w-3.5" />}>
              {t('btn.clear')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              {t('btn.export')}
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" role="group" aria-label="Level filter">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              aria-pressed={selectedLevel === lvl}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all uppercase cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hz-brand-400/50',
                selectedLevel === lvl
                  ? 'bg-hz-brand-400 text-white shadow-md shadow-hz-brand-400/25'
                  : 'bg-hz-navy-700 border border-hz-navy-500 text-hz-gray-400 hover:text-white hover:bg-hz-navy-600'
              )}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="w-72">
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={t('console.search')}
            className="text-xs font-mono py-1"
            aria-label={t('console.search')}
          />
        </div>
      </div>

      {/* Virtualized log feed */}
      <Card className="flex-1 min-h-0 p-0 overflow-hidden flex flex-col font-mono text-xs shadow-lg shadow-black/25" flat>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 bg-hz-navy-900/90"
          aria-live={paused ? 'off' : 'polite'}
        >
          {filteredLogs.length === 0 ? (
            <EmptyState
              className="h-full text-hz-gray-400"
              icon={<SlidersHorizontal className="h-5 w-5 text-hz-brand-400" />}
              title={t('console.empty.title')}
              description={t('console.empty.desc')}
            />
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((row) => {
                const log = filteredLogs[row.index];
                return (
                  <div
                    key={`${log.timestamp_ms}-${row.index}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: row.size,
                      transform: `translateY(${row.start}px)`,
                    }}
                    className="flex items-start gap-3 py-1 hover:bg-white/[0.02] rounded-lg px-2 transition-colors"
                  >
                    <span className="text-hz-gray-500 text-[10px] select-none shrink-0 font-mono">
                      {formatTime(log.timestamp_ms)}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0',
                        levelStyles[log.level] ?? levelStyles.debug
                      )}
                    >
                      {log.level}
                    </span>
                    <span className="text-hz-brand-300 text-[11px] font-bold select-none shrink-0">
                      [{log.target}]
                    </span>
                    <span className="text-hz-gray-400 text-xs flex-1 break-all selectable font-mono">{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 bg-hz-navy-800 border-t border-hz-navy-500/40 flex items-center justify-between text-[11px] text-hz-gray-400">
          <span>
            {isTh
              ? `แสดง ${filteredLogs.length} จาก ${logs.length} รายการ${paused ? ' (หยุดรับชั่วคราว)' : ''}`
              : `${filteredLogs.length} of ${logs.length} events${paused ? ' (paused)' : ''}`}
          </span>
          <span className="font-mono">{stickToBottom.current ? '↓ auto-scroll' : ''}</span>
        </div>
      </Card>
    </div>
  );
}
