import { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { Card, Button } from '../ui';

interface PatcherTerminalProps {
  isTh: boolean;
  logs: string[];
}

export function PatcherTerminal({ isTh, logs }: PatcherTerminalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white text-xs font-semibold">
          <Terminal className="h-4 w-4 text-zinc-300" />
          <span>{isTh ? 'บันทึกการทำงานของระบบ (Execution Logs)' : 'Execution Logs'}</span>
        </div>
        {logs.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            icon={copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            className="text-hz-gray-400 hover:text-white h-6.5 text-[11px]"
          >
            {copied ? (isTh ? 'คัดลอกแล้ว' : 'Copied') : (isTh ? 'คัดลอก' : 'Copy')}
          </Button>
        )}
      </div>
      <div className="bg-hz-navy-900/90 p-3 rounded-xl border border-hz-navy-500/40 font-mono text-[11px] h-40 overflow-y-auto space-y-1 text-hz-gray-300 scrollbar-thin">
        {logs.map((line, idx) => {
          const isOk = line.includes('[OK]');
          const isErr = line.includes('[ERR]');
          return (
            <div
              key={idx}
              className={isOk ? 'text-emerald-400 font-medium' : isErr ? 'text-rose-400 font-medium' : 'text-hz-gray-300'}
            >
              {line}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
