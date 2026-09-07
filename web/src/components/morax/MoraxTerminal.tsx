import { CheckCircle2, FolderDown } from 'lucide-react';
import { Button, UnifiedLogConsole } from '../ui';
import { useT } from '../../lib/hooks';

interface MoraxTerminalProps {
  logs: string[];
  onOpenExplorer: () => void;
  onClear?: () => void;
}

export function MoraxTerminal({ logs, onOpenExplorer, onClear }: MoraxTerminalProps) {
  const { isTh } = useT();

  return (
    <div className="flex-1 min-h-[300px] flex flex-col">
      <UnifiedLogConsole
        title={isTh ? 'บันทึกการทำงานของ Morax Engine' : 'Morax Execution & Artifact Stream'}
        subtitle="Multi-threaded iced-x86 & IL2CPP Resolver"
        logs={logs}
        onClear={onClear}
        exportFileName="morax-engine-execution.log"
        heightClassName="h-64 sm:h-72"
        extraFooter={
          <div className="flex items-center justify-between text-[11px] text-emerald-400 font-sans gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {isTh ? 'ไฟล์ผลลัพธ์พร้อมใช้งาน:' : 'Ready Artifacts:'}{' '}
              <span className="font-mono text-hz-gray-400">StarRail.proto, packetIds.json, dump.cs, methods.json, il2cpp.h</span>
            </span>
            <Button variant="secondary" size="xs" onClick={onOpenExplorer} icon={<FolderDown className="h-3.5 w-3.5" />}>
              {isTh ? 'เปิดโฟลเดอร์ DUMP' : 'Open Output Folder'}
            </Button>
          </div>
        }
      />
    </div>
  );
}
