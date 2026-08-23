import { useEffect, useRef, useState } from 'react';
import {
  Binary,
  CheckCircle2,
  Code,
  FileCode2,
  FolderDown,
  Layers,
  Play,
  RotateCcw,
  Terminal,
  XCircle,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader } from '../ui';
import { useAppStore, dumperJobKey } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { ipc } from '../../lib/ipc-client';
import { DumperAction } from '../../lib/types';
import { openDumpFolderInExplorer } from '../../lib/filePicker';
import { cn } from '../../lib/utils';

interface PipelineTask {
  id: string;
  action: DumperAction;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  output: string;
}

const TASKS: PipelineTask[] = [
  {
    id: 'c_sharp',
    action: { type: 'c_sharp' },
    titleKey: 'dumper.task.cs.title',
    descKey: 'dumper.task.cs.desc',
    icon: Code,
    output: 'dump.cs',
  },
  {
    id: 'proto',
    action: { type: 'proto', mode: 'asm' },
    titleKey: 'dumper.task.proto.title',
    descKey: 'dumper.task.proto.desc',
    icon: Binary,
    output: 'StarRail.proto',
  },
  {
    id: 'data',
    action: { type: 'parser_data' },
    titleKey: 'dumper.task.data.title',
    descKey: 'dumper.task.data.desc',
    icon: Layers,
    output: 'data.json',
  },
  {
    id: 'resources',
    action: { type: 'resources' },
    titleKey: 'dumper.task.hdr.title',
    descKey: 'dumper.task.hdr.desc',
    icon: FileCode2,
    output: 'il2cpp.h',
  },
];

export function DumperView() {
  const { t, isTh } = useT();

  const dumperRunning = useAppStore((state) => state.dumperRunning);
  const dumperJobs = useAppStore((state) => state.dumperJobs);
  const backendConnected = useAppStore((state) => state.backendConnected);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  const [logLines, setLogLines] = useState<string[]>([
    isTh
      ? '💡 เคล็ดลับ: การ Dump สดจาก Memory จำเป็นต้องเปิดตัวเกม StarRail.exe ให้โหลดเข้าเกมก่อน หรือใช้ Morax สำหรับถอดรหัสแบบออฟไลน์ทันทีโดยไม่ต้องเปิดเกม'
      : '💡 Tip: Live Memory Dump requires StarRail.exe to be running, or use Morax for instant offline metadata decryption.',
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  /* Job status comes from real backend events (wired in App.tsx). */
  useEffect(() => {
    for (const [key, job] of Object.entries(dumperJobs)) {
      if (job.status === 'running') {
        appendLog(`▶ ${key} — started`);
      } else if (job.status === 'done') {
        appendLog(`✔ ${key} — finished in ${job.seconds ?? '?'}s`);
      } else if (job.status === 'failed') {
        appendLog(`✖ ${key} — failed: ${job.error ?? 'unknown error'}`);
      }
    }
  }, [dumperJobs]);

  function appendLog(line: string) {
    setLogLines((prev) => [...prev.slice(-200), line]);
  }

  const handleRunDumper = (task: PipelineTask) => {
    if (!backendConnected) {
      appendLog(
        isTh
          ? `⚠️ ไม่สามารถส่งคำสั่ง ${task.id}: ตัวเกม StarRail.exe ยังไม่ได้เปิด หรือยังไม่ได้ Hook dumper.dll (กำลังรอพอร์ต 42857)`
          : `⚠️ Cannot dispatch ${task.id}: StarRail.exe is offline or dumper.dll is not hooked yet (waiting for port 42857)`
      );
      appendLog(
        isTh
          ? `👉 แนะนำ: ไปที่เมนู 'Morax Cracker' เพื่อถอดรหัสไฟล์ dump.cs / proto ได้ทันที 100% แบบออฟไลน์โดยไม่ต้องเปิดเกม`
          : `👉 Recommendation: Use 'Morax Cracker' tab to dump dump.cs & proto instantly offline without launching the game.`
      );
    } else {
      appendLog(`▶ ${task.id} — dispatch requested to live game process`);
    }
    ipc.runDumper(task.action);
  };

  const handleOpenInExplorer = async () => {
    const opened = await openDumpFolderInExplorer();
    if (opened) {
      appendLog('✔ opened explorer at ./DUMP');
    } else {
      appendLog('💡 path copied to clipboard: ./DUMP');
    }
  };

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto">
      <SectionHeader
        icon={<Binary className="h-5 w-5" />}
        title={t('dumper.title')}
        badge={
          <Badge variant={backendConnected ? 'emerald' : 'amber'} dot={backendConnected}>
            {backendConnected
              ? (isTh ? 'เชื่อมต่อตัวเกมแล้ว' : 'GAME HOOK CONNECTED')
              : (isTh ? 'รอตัวเกม Star Rail เปิด' : 'WAITING FOR GAME')}
          </Badge>
        }
        description={t('dumper.desc')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage('morax')}
              icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
            >
              {isTh ? '⚡ ถอดรหัสออฟไลน์ (Morax)' : '⚡ Offline Decrypt (Morax)'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRunDumper(TASKS[0])}
              disabled={dumperRunning}
              icon={<Play className="h-3.5 w-3.5 fill-current" />}
            >
              {t('dumper.run_full')}
            </Button>
          </div>
        }
      />

      {/* Notice box if game is offline */}
      {!backendConnected && (
        <Card className="p-3.5 border border-amber-500/25 bg-amber-950/10 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-amber-200">
              {isTh ? 'คำแนะนำการ Dump ข้อมูล' : 'IL2CPP Dump Instructions'}
            </div>
            <div className="text-zinc-300 leading-relaxed text-[11px]">
              {isTh ? (
                <>
                  1. <strong>Live Memory Dump:</strong> ต้องเปิดตัวเกม StarRail.exe ให้โหลดเข้าเกมก่อน DLL ถึงจะอ่านหน่วยความจำได้
                  <br />
                  2. <strong>Offline Metadata Parse:</strong> ไปที่หน้า{' '}
                  <button
                    onClick={() => setCurrentPage('morax')}
                    className="text-indigo-400 underline font-medium hover:text-white"
                  >
                    Morax Parser
                  </button>{' '}
                  เพื่อแยกไฟล์ <code>dump.cs</code>, <code>StarRail.proto</code>, และ <code>il2cpp.h</code> ได้ทันทีโดยไม่ต้องเปิดเกม
                </>
              ) : (
                <>
                  1. <strong>Live Memory Dump:</strong> StarRail.exe must be running for memory dumping.
                  <br />
                  2. <strong>Offline Parser:</strong> Use{' '}
                  <button
                    onClick={() => setCurrentPage('morax')}
                    className="text-indigo-400 underline font-medium hover:text-white"
                  >
                    Morax Parser
                  </button>{' '}
                  to generate <code>dump.cs</code>, <code>StarRail.proto</code>, and <code>il2cpp.h</code> offline without launching the client.
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TASKS.map((task) => {
          const key = dumperJobKey(task.action);
          const job = dumperJobs[key] || { status: 'idle' };
          const status = job.status;
          const Icon = task.icon;

          return (
            <Card key={task.id} className="p-4 bg-gray-900/40 border-gray-800 flex flex-col h-full relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl border transition-colors',
                      status === 'running'
                        ? 'bg-hz-brand-400/20 border-hz-brand-400/40 text-hz-brand-300'
                        : status === 'done'
                          ? 'bg-hz-green-400/15 border-hz-green-400/25 text-hz-green-400'
                          : status === 'failed'
                            ? 'bg-hz-red-400/15 border-hz-red-400/25 text-hz-red-400'
                            : 'bg-hz-navy-900 border-hz-navy-500 text-hz-brand-400'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{t(task.titleKey)}</h3>
                    <p className="text-[11px] text-hz-gray-400 mt-0.5">{t(task.descKey)}</p>
                  </div>
                </div>

                {status === 'done' ? (
                  <Badge variant="emerald">
                    <CheckCircle2 className="h-3 w-3" /> {job?.seconds ?? '?'}s
                  </Badge>
                ) : status === 'failed' ? (
                  <Badge variant="rose">
                    <XCircle className="h-3 w-3" /> {t('status.failed')}
                  </Badge>
                ) : status === 'running' ? (
                  <Badge variant="violet" dot>
                    {t('status.working')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono">
                    {task.output}
                  </Badge>
                )}
              </div>

              <div className="pt-2.5 border-t border-hz-navy-500/40 flex items-center justify-between">
                <span className="text-[11px] font-mono text-hz-gray-400">{task.output}</span>
                <Button
                  variant={status === 'done' ? 'secondary' : 'primary'}
                  size="xs"
                  loading={status === 'running'}
                  disabled={dumperRunning && status !== 'running'}
                  onClick={() => handleRunDumper(task)}
                  icon={status === 'done' ? <RotateCcw className="h-3 w-3" /> : undefined}
                >
                  {status === 'done' ? t('btn.rerun') : (isTh ? 'Dump' : 'Dump')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Output log terminal */}
      <Card className="flex flex-col p-4 text-xs overflow-hidden space-y-3 font-mono shadow-lg shadow-black/20" flat>
        <div className="flex items-center justify-between pb-2.5 border-b border-hz-navy-500/40 text-white">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-hz-green-400" aria-hidden="true" />
            <span className="text-xs font-bold text-white">{t('dumper.output_stream')}</span>
          </div>
          <span className="text-[10px] text-hz-gray-500 font-mono">IPC Stream</span>
        </div>

        <div ref={logRef} className="h-40 overflow-y-auto space-y-1 text-[11px] p-3 rounded-xl bg-hz-navy-900 border border-hz-navy-500/50 scrollbar-thin">
          {logLines.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                'break-all font-mono leading-relaxed',
                line.startsWith('✔') && 'text-hz-green-400 font-semibold',
                line.startsWith('✖') && 'text-hz-red-400 font-semibold',
                line.startsWith('⚠️') && 'text-hz-orange-400',
                line.startsWith('👉') && 'text-hz-brand-300 font-semibold',
                line.startsWith('💡') && 'text-hz-gray-400',
                line.startsWith('▶') && 'text-hz-brand-300'
              )}
            >
              {line}
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-hz-navy-500/40 flex justify-between items-center text-xs text-hz-gray-400 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span>{isTh ? 'โฟลเดอร์ผลลัพธ์:' : 'Output Directory:'}</span>
            <code className="text-hz-green-400 font-mono bg-hz-navy-900 px-2.5 py-0.5 rounded-lg border border-hz-navy-500">./DUMP/IL2CPP_Dumper/</code>
          </div>
          <Button variant="secondary" size="xs" onClick={handleOpenInExplorer} icon={<FolderDown className="h-3.5 w-3.5" />}>
            {isTh ? 'เปิดใน Explorer' : 'Open in Explorer'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
