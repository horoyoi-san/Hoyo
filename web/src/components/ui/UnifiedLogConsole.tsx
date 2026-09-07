import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Search,
  Copy,
  Check,
  Trash2,
  Download,
  ArrowDownCircle,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { useT } from '../../lib/hooks';

export type LogCategory = 'all' | 'proc' | 'success' | 'err' | 'info';

export interface LogEntry {
  id?: string | number;
  time?: string | number;
  text: string;
  category?: LogCategory;
}

export interface UnifiedLogConsoleProps {
  title?: string;
  subtitle?: string;
  logs: (string | LogEntry)[];
  onClear?: () => void;
  className?: string;
  containerClassName?: string;
  heightClassName?: string;
  showSearch?: boolean;
  showTabs?: boolean;
  showExport?: boolean;
  showAutoScroll?: boolean;
  exportFileName?: string;
  extraHeaderActions?: React.ReactNode;
  extraFooter?: React.ReactNode;
}

export function UnifiedLogConsole({
  title,
  subtitle,
  logs,
  onClear,
  className,
  containerClassName,
  heightClassName = 'flex-1 min-h-0',
  showSearch = true,
  showTabs = true,
  showExport = true,
  showAutoScroll = true,
  exportFileName = 'astral-os-process.log',
  extraHeaderActions,
  extraFooter,
}: UnifiedLogConsoleProps) {
  const { isTh } = useT();

  const [activeTab, setActiveTab] = useState<LogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  // Normalize string[] or LogEntry[] into structured items
  const parsedLogs = useMemo<LogEntry[]>(() => {
    return logs.map((item, idx) => {
      if (typeof item === 'string') {
        const text = item;
        let category: LogCategory = 'info';
        if (text.includes('[OK]') || text.includes('Successfully') || text.includes('Success') || text.includes('Done')) {
          category = 'success';
        } else if (text.includes('[ERR]') || text.includes('Error') || text.includes('failed') || text.includes('Failed')) {
          category = 'err';
        } else if (
          text.includes('[PROC') ||
          text.includes('[*]') ||
          text.includes('Starting') ||
          text.includes('Verifying') ||
          text.includes('Scanning') ||
          text.includes('Compiling') ||
          text.includes('Decoding') ||
          text.includes('Step')
        ) {
          category = 'proc';
        }

        // Check if timestamp is already in brackets [HH:mm:ss]
        const timeMatch = text.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
        const time = timeMatch ? timeMatch[1] : undefined;
        const cleanText = timeMatch ? text.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '') : text;

        return {
          id: idx + 1,
          time,
          text: cleanText,
          category,
        };
      }

      let category: LogCategory = item.category || 'info';
      if (!item.category) {
        if (item.text.includes('[OK]') || item.text.includes('Successfully')) category = 'success';
        else if (item.text.includes('[ERR]') || item.text.includes('Error')) category = 'err';
        else if (item.text.includes('[PROC') || item.text.includes('[*]')) category = 'proc';
      }

      return {
        id: item.id ?? idx + 1,
        time: item.time,
        text: item.text,
        category,
      };
    });
  }, [logs]);

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: parsedLogs.length, proc: 0, success: 0, err: 0, info: 0 };
    for (const l of parsedLogs) {
      if (l.category === 'proc') c.proc++;
      else if (l.category === 'success') c.success++;
      else if (l.category === 'err') c.err++;
      else c.info++;
    }
    return c;
  }, [parsedLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parsedLogs.filter((item) => {
      if (activeTab !== 'all' && item.category !== activeTab) {
        return false;
      }
      if (q && !item.text.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [parsedLogs, activeTab, searchQuery]);

  // Auto-scroll handler
  useEffect(() => {
    if (autoScroll && !isUserScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If user scrolled up by more than 30px from bottom, pause auto-scroll lock
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 35;
    isUserScrolledUp.current = !isAtBottom;
  };

  const handleCopy = () => {
    const text = filteredLogs.map((l) => (l.time ? `[${l.time}] ${l.text}` : l.text)).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const text = parsedLogs.map((l) => (l.time ? `[${l.time}] ${l.text}` : l.text)).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('flex flex-col rounded-2xl bg-hz-navy-900 border border-zinc-800 overflow-hidden shadow-xl shadow-black/25', className)}>
      {/* Header */}
      <div className="h-11 px-4 border-b border-zinc-800/80 bg-hz-navy-850 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 text-white font-mono text-xs">
          <Terminal className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-bold truncate">{title || (isTh ? 'บันทึกการทำงานของระบบ (Process Logs)' : 'Process Execution Stream')}</span>
          {subtitle && <span className="text-[10px] text-zinc-400 hidden sm:inline truncate">({subtitle})</span>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
            {filteredLogs.length} / {parsedLogs.length} Events
          </Badge>
          {extraHeaderActions}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="px-3 py-2 border-b border-zinc-800/80 bg-hz-navy-900/90 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {/* Category Tabs */}
        {showTabs && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'all'
                  ? 'bg-zinc-800 text-white border border-zinc-700/70 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <Layers className="h-3 w-3" />
              <span>ALL</span>
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-[9px] font-bold',
                activeTab === 'all' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-500'
              )}>
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('proc')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'proc'
                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/70 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <Activity className="h-3 w-3" />
              <span>PROCESS</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-zinc-800 font-bold border border-zinc-700/60 text-zinc-300">
                {counts.proc}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('success')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800/50'
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>SUCCESS</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-950/60 font-bold border border-emerald-800/40 text-emerald-300">
                {counts.success}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('err')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'err'
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-rose-300 hover:bg-zinc-800/50'
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>ERRORS</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-950/60 font-bold border border-rose-800/40 text-rose-300">
                {counts.err}
              </span>
            </button>
          </div>
        )}

        {/* Search & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {showSearch && (
            <div className="relative w-full sm:w-48 md:w-60 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTh ? 'ค้นหาข้อความ Log...' : 'Filter logs...'}
                className="w-full pl-7 pr-6 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-hz-gray-400 hover:text-white text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {showAutoScroll && (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(!autoScroll);
                isUserScrolledUp.current = false;
              }}
              className={cn(
                'p-1.5 rounded-lg border text-xs transition-colors shrink-0',
                autoScroll
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                  : 'bg-hz-navy-950 border-hz-navy-600 text-hz-gray-400 hover:text-white'
              )}
              title={isTh ? 'เลื่อนลงล่างสุดอัตโนมัติ' : 'Toggle Auto-Scroll'}
            >
              <ArrowDownCircle className="h-3.5 w-3.5" />
            </button>
          )}

          <Button
            variant="outline"
            size="xs"
            onClick={handleCopy}
            icon={copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            title="Copy Logs"
          >
            {copied ? (isTh ? 'คัดลอกแล้ว' : 'Copied') : (isTh ? 'คัดลอก' : 'Copy')}
          </Button>

          {showExport && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleExport}
              icon={<Download className="h-3 w-3 text-zinc-300" />}
              title="Export Log File"
            >
              .log
            </Button>
          )}

          {onClear && (
            <Button
              variant="outline"
              size="xs"
              onClick={onClear}
              icon={<Trash2 className="h-3 w-3 text-rose-400" />}
              title="Clear Logs"
            >
              {isTh ? 'ล้าง' : 'Clear'}
            </Button>
          )}
        </div>
      </div>

      {/* Log Stream Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          'overflow-y-auto p-3 space-y-1 font-mono text-[11px] bg-hz-navy-950/80 scrollbar-thin select-text',
          heightClassName,
          containerClassName
        )}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full min-h-[100px] flex items-center justify-center text-hz-gray-500 italic text-xs py-8">
            <Info className="h-4 w-4 mr-2 opacity-50" />
            {isTh ? 'ยังไม่มีข้อมูล Log หรือไม่พบข้อความที่ค้นหา' : 'No log events match the current filter.'}
          </div>
        ) : (
          filteredLogs.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-2 break-all leading-relaxed py-0.5 px-2 rounded transition-colors',
                item.category === 'success' && 'text-emerald-300 bg-emerald-950/15',
                item.category === 'err' && 'text-rose-300 bg-rose-950/20 font-medium',
                item.category === 'proc' && 'text-zinc-300 bg-zinc-800/40',
                item.category === 'info' && 'text-hz-gray-400 hover:bg-white/[0.02]'
              )}
            >
              {item.time && <span className="text-hz-gray-500 text-[10px] shrink-0 select-none">[{item.time}]</span>}

              {item.category === 'proc' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-700/50 text-zinc-200 border border-zinc-600/60 shrink-0">
                  PROC
                </span>
              )}
              {item.category === 'success' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  OK
                </span>
              )}
              {item.category === 'err' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  ERR
                </span>
              )}
              {item.category === 'info' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-hz-navy-800 text-hz-gray-400 border border-hz-navy-500 shrink-0">
                  INFO
                </span>
              )}

              <span className="flex-1 whitespace-pre-wrap">{item.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Optional Footer */}
      {extraFooter && (
        <div className="p-2.5 border-t border-hz-navy-500/40 bg-hz-navy-850 shrink-0 text-xs">
          {extraFooter}
        </div>
      )}
    </div>
  );
}
