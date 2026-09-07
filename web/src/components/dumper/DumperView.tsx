import { useEffect, useMemo, useRef, useState } from 'react';
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
  Database,
  Clock,
  FolderOpen,
  Trash2,
  Search,
  Copy,
  Check,
  FileDown,
  Filter,
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader } from '../ui';
import { useAppStore, dumperJobKey } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { ipc } from '../../lib/ipc-client';
import { DumperAction } from '../../lib/types';
import { tauriApi, isTauri, StarRailDataDumpResult } from '../../lib/tauri';
import { openDumpFolderInExplorer } from '../../lib/filePicker';
import { cn } from '../../lib/utils';

interface PipelineTask {
  id: string;
  action: DumperAction;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  output: string;
  approxSize: string;
}

const TASKS: PipelineTask[] = [
  {
    id: 'c_sharp',
    action: { type: 'c_sharp' },
    titleKey: 'dumper.task.cs.title',
    descKey: 'dumper.task.cs.desc',
    icon: Code,
    output: 'dump.cs',
    approxSize: '~28.4 MB',
  },
  {
    id: 'proto',
    action: { type: 'proto', mode: 'asm' },
    titleKey: 'dumper.task.proto.title',
    descKey: 'dumper.task.proto.desc',
    icon: Binary,
    output: 'StarRail.proto',
    approxSize: '~1.45 MB',
  },
  {
    id: 'data',
    action: { type: 'parser_data' },
    titleKey: 'dumper.task.data.title',
    descKey: 'dumper.task.data.desc',
    icon: Layers,
    output: 'data.json',
    approxSize: '~12.2 MB',
  },
  {
    id: 'struct_hdr',
    action: { type: 'script_v2' },
    titleKey: 'dumper.task.hdr.title',
    descKey: 'dumper.task.hdr.desc',
    icon: FileCode2,
    output: 'il2cpp.h / struct.h',
    approxSize: '~3.2 MB',
  },
  {
    id: 'resources',
    action: { type: 'resources' },
    titleKey: 'dumper.task.res.title',
    descKey: 'dumper.task.res.desc',
    icon: Database,
    output: 'Resources/ (Excel & TextMap)',
    approxSize: '~2.1 GB',
  },
];

export function DumperView() {
  const { t, isTh } = useT();

  const dumperRunning = useAppStore((state) => state.dumperRunning);
  const dumperJobs = useAppStore((state) => state.dumperJobs);
  const gameHookConnected = useAppStore((state) => state.gameHookConnected);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const gamePath = useAppStore((state) => state.gamePath);

  const [logLines, setLogLines] = useState<string[]>([]);
  const [preserveRaw, setPreserveRaw] = useState(true);
  const [dataDumpLoading, setDataDumpLoading] = useState(false);
  const [dataDumpResult, setDataDumpResult] = useState<StarRailDataDumpResult | null>(null);

  // Log filter & search controls
  type LogTab = 'all' | 'extract' | 'success' | 'errors' | 'raw';
  const [activeTab, setActiveTab] = useState<LogTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Live elapsed timer
  const [activeTaskRunning, setActiveTaskRunning] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    if (!activeTaskRunning && !dataDumpLoading && !dumperRunning) {
      return;
    }
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedSec(Math.round(((Date.now() - startTime) / 1000) * 10) / 10);
    }, 100);
    return () => {
      clearInterval(timer);
      setElapsedSec(0);
    };
  }, [activeTaskRunning, dataDumpLoading, dumperRunning]);

  // Cancel pending live task if game hook disconnects
  useEffect(() => {
    if (!gameHookConnected && activeTaskRunning) {
      setActiveTaskRunning(null);
    }
  }, [gameHookConnected, activeTaskRunning]);

  // Safety timeout: if live task runs > 25s with no response, abort running state
  useEffect(() => {
    if (!activeTaskRunning) return;
    const timeout = setTimeout(() => {
      setActiveTaskRunning(null);
      appendLog(
        isTh
          ? `[ERR] คำสั่ง ${activeTaskRunning} หมดเวลา (25s) ไม่ได้รับการตอบสนองจากตัวเกม`
          : `[ERR] Task ${activeTaskRunning} timed out (25s): no response from game process`
      );
    }, 25000);
    return () => clearTimeout(timeout);
  }, [activeTaskRunning, isTh]);

  const logRef = useRef<HTMLDivElement>(null);

  const parsedLogs = useMemo(() => {
    return logLines.map((line, idx) => {
      let category: 'extract' | 'success' | 'errors' | 'raw' | 'info' = 'info';
      if (line.startsWith('[OK]') || line.toLowerCase().includes('success') || line.toLowerCase().includes('complete')) {
        category = 'success';
      } else if (line.startsWith('[ERR]') || line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
        category = 'errors';
      } else if (line.includes('RAW') || line.includes('ไบนารี') || line.includes('.bytes') || line.includes('.dat')) {
        category = 'raw';
      } else if (line.includes('สกัด') || line.includes('dump') || line.includes('Extract') || line.includes('.json') || line.includes('Config') || line.includes('Excel') || line.includes('TextMap')) {
        category = 'extract';
      }
      return { id: idx + 1, text: line, category };
    });
  }, [logLines]);

  const logCounts = useMemo(() => {
    return {
      all: parsedLogs.length,
      extract: parsedLogs.filter((l) => l.category === 'extract').length,
      success: parsedLogs.filter((l) => l.category === 'success').length,
      errors: parsedLogs.filter((l) => l.category === 'errors').length,
      raw: parsedLogs.filter((l) => l.category === 'raw').length,
    };
  }, [parsedLogs]);

  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((log) => {
      if (activeTab !== 'all' && log.category !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        return log.text.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [parsedLogs, activeTab, searchQuery]);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLogs = () => {
    const blob = new Blob([logLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `astralos-dumper-log-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const prevJobsRef = useRef<Record<string, string>>({});

  /* Job status comes from backend events */
  useEffect(() => {
    for (const [key, job] of Object.entries(dumperJobs)) {
      const prevStatus = prevJobsRef.current[key];
      if (job.status === prevStatus) continue;
      prevJobsRef.current[key] = job.status;

      if (job.status === 'running') {
        appendLog(`[*] ${key} — processing memory stream...`);
        setActiveTaskRunning(key);
      } else if (job.status === 'done') {
        appendLog(`[OK] ${key} — finished in ${job.seconds ?? '?'}s`);
        setActiveTaskRunning(null);
      } else if (job.status === 'failed') {
        appendLog(`[ERR] ${key} — failed: ${job.error ?? 'unknown error'}`);
        setActiveTaskRunning(null);
      }
    }
  }, [dumperJobs]);

  function appendLog(line: string) {
    setLogLines((prev) => [...prev.slice(-300), line]);
  }

  const handleRunDumper = (task: PipelineTask) => {
    if (!gameHookConnected) {
      appendLog(
        isTh
          ? `[ERR] ไม่สามารถส่งคำสั่ง ${task.id}: ตัวเกม StarRail.exe ยังไม่ได้เปิด หรือยังไม่ได้เชื่อมต่อ Hook (กำลังรอพอร์ต 42857)`
          : `[ERR] Cannot dispatch ${task.id}: StarRail.exe is offline or hook is not active (waiting for port 42857)`
      );
      appendLog(
        isTh
          ? `[*] แนะนำ: คลิกปุ่ม 'ถอดรหัสออฟไลน์ (Morax)' หรือ 'Dump StarRail_Data' เพื่อสกัดไฟล์ได้ทันทีโดยไม่ต้องเปิดเกม`
          : `[*] Recommendation: Use 'Offline Decrypt (Morax)' or 'Dump StarRail_Data' to extract files immediately without launching the game.`
      );
      return;
    }

    setActiveTaskRunning(task.id);
    appendLog(`[*] ${task.id} — dispatch requested to live game process`);
    ipc.runDumper(task.action);
  };

  const handleDumpStarRailData = async () => {
    if (!gamePath.trim()) {
      appendLog(
        isTh
          ? '[ERR] กรุณาระบุ Game Directory ในหน้าการตั้งค่าก่อนเริ่มสกัด StarRail_Data'
          : '[ERR] Please configure Game Directory in Settings before dumping StarRail_Data'
      );
      return;
    }

    setDataDumpLoading(true);
    appendLog(
      isTh
        ? `[PROC 1/4] เริ่มสแกนโฟลเดอร์เกมและระบุไฟล์บล็อก Persistent/DesignData จาก: ${gamePath}`
        : `[PROC 1/4] Scanning game directories & identifying block packages from: ${gamePath}`
    );
    if (preserveRaw) {
      appendLog(
        isTh
          ? `[*] เปิดใช้งานการรักษาไฟล์ RAW ไบนารีสำหรับ Ghidra / IDA Pro -> DUMP/StarRail_Data/RAW/`
          : `[*] Preserving RAW binary files for Ghidra / IDA Pro -> DUMP/StarRail_Data/RAW/`
      );
    }

    try {
      if (isTauri()) {
        appendLog(isTh ? '[PROC 2/4] กำลังถอดรหัสตาราง ExcelOutput (Item, Avatar, Monster, Stage)...' : '[PROC 2/4] Decoding ExcelOutput tables (Item, Avatar, Monster, Stage)...');
        appendLog(isTh ? '[PROC 3/4] สกัด Config/LevelOutput, Stages/Outputs และ Story Missions...' : '[PROC 3/4] Extracting Config/LevelOutput, Stages/Outputs, and Story Missions...');
        const res = await tauriApi.executeDumpStarRailData(gamePath, '', preserveRaw);
        setDataDumpResult(res);
        appendLog(isTh ? '[PROC 4/4] แปลง TextMap เป็นฟอร์แมต Dimbreath Key-Value Dictionary มาตรฐาน...' : '[PROC 4/4] Converted TextMap to standard Dimbreath Key-Value dictionary map.');
        appendLog(`[OK] ${res.message}`);
        if (res.rawDir) {
          appendLog(`[OK] RAW files preserved at: ${res.rawDir}`);
        }
      } else {
        // Dev Simulation
        setTimeout(() => {
          const mock: StarRailDataDumpResult = {
            success: true,
            totalExtracted: 5240,
            configCount: 3410,
            excelCount: 920,
            stagesCount: 145,
            storyCount: 64,
            textmapCount: 13,
            timeSeconds: 4.85,
            outputDir: './DUMP/StarRail_Data',
            rawDir: preserveRaw ? './DUMP/RAW/StarRail_Data' : undefined,
            message: 'StarRail_Data dumped successfully in 4.85s: 3410 Configs, 920 Excel tables, 145 Stages, 64 Story, 13 TextMaps',
          };
          setDataDumpResult(mock);
          appendLog(`[OK] [Dev Mode] ${mock.message}`);
          setDataDumpLoading(false);
        }, 1500);
        return;
      }
    } catch (err: any) {
      appendLog(`[ERR] StarRail_Data dump failed: ${err?.message || err}`);
    } finally {
      setDataDumpLoading(false);
    }
  };

  const handleOpenInExplorer = async () => {
    const opened = await openDumpFolderInExplorer();
    if (opened) {
      appendLog('[OK] opened explorer at ./DUMP');
    } else {
      appendLog('[*] path copied to clipboard: ./DUMP');
    }
  };

  const handleClearLogs = () => {
    setLogLines([
      isTh ? '[*] ล้างประวัติข้อความ Terminal เรียบร้อย' : '[*] Terminal log history cleared',
    ]);
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5 bg-hz-navy-900">
      <SectionHeader
        icon={<Binary className="h-5 w-5" />}
        title={t('dumper.title')}
        badge={
          <Badge variant={gameHookConnected ? 'emerald' : 'amber'} dot={gameHookConnected}>
            {gameHookConnected
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
              {isTh ? 'ถอดรหัสออฟไลน์ (Morax)' : 'Offline Decrypt (Morax)'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRunDumper(TASKS[0])}
              disabled={!gameHookConnected || dumperRunning || dataDumpLoading}
              icon={<Play className="h-3.5 w-3.5 fill-current" />}
            >
              {t('dumper.run_full')}
            </Button>
          </div>
        }
      />

      {/* Notice box if game is offline */}
      {!gameHookConnected && (
        <Card className="p-4 border border-amber-500/30 bg-amber-950/15 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-amber-200 flex items-center gap-2">
                <span>{isTh ? 'โหมดแนะนำ: สกัดข้อมูลแบบไม่ต้องเปิดเกม' : 'Smart Suggestion: Extract Without Running Game'}</span>
                <Badge variant="amber" className="text-[9px]">OFFLINE READY</Badge>
              </div>
              <p className="text-hz-gray-400 leading-relaxed text-[11px]">
                {isTh
                  ? 'ระบบ Live Memory Dumper ต้องรอให้ตัวเกม StarRail.exe โหลดเข้าเกมก่อน หากต้องการไฟล์ dump.cs, StarRail.proto หรือ Config/Excel/TextMap สามารถใช้ฟังก์ชันสกัดแบบออฟไลน์ด้านล่างได้ทันที'
                  : 'Live Memory Dumper requires StarRail.exe in memory. To extract dump.cs, StarRail.proto, or Config/Excel/TextMap immediately, use our native offline extractors below.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setCurrentPage('morax')}
              icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
              className="flex-1 sm:flex-initial"
            >
              {isTh ? 'เปิด Morax' : 'Open Morax'}
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={handleDumpStarRailData}
              disabled={dataDumpLoading}
              loading={dataDumpLoading}
              icon={<Database className="h-3.5 w-3.5" />}
              className="flex-1 sm:flex-initial"
            >
              {isTh ? 'Dump ข้อมูลเกมทันที' : 'Dump Game Data'}
            </Button>
          </div>
        </Card>
      )}

      {/* FEATURE CARD: StarRail_Data / TurnBasedGameData Native Client Dump */}
      <Card className="p-5 border border-white/10 bg-zinc-900/90 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700/60 text-zinc-200 shadow-md shadow-black/20">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {isTh ? 'สกัดโครงสร้าง StarRail_Data (TurnBasedGameData Client Dump)' : 'StarRail_Data Native Client Dump (Dimbreath Structure)'}
                </h3>
                <Badge variant="violet" className="text-[9px]">100% SELF-DUMPED</Badge>
              </div>
              <p className="text-xs text-hz-gray-400 mt-1 leading-relaxed">
                {isTh
                  ? 'สกัดไฟล์ Config, ExcelOutput (JSON) และ TextMap จากตัวเกม Star Rail ตามโครงสร้าง TurnBasedGameData'
                  : 'Extract Config, ExcelOutput (JSON), and TextMap datasets directly from client package assets.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-hz-gray-400 select-none bg-hz-navy-900/80 px-3 py-1.5 rounded-xl border border-hz-navy-500/60 hover:border-zinc-600 transition-colors">
              <input
                type="checkbox"
                checked={preserveRaw}
                onChange={(e) => setPreserveRaw(e.target.checked)}
                className="rounded border-hz-navy-500 text-white focus:ring-zinc-500 h-3.5 w-3.5 accent-white"
              />
              <span>{isTh ? 'เก็บไฟล์ RAW ไบนารี (.bytes)' : 'Preserve RAW (.bytes)'}</span>
            </label>

            <Button
              variant="primary"
              size="sm"
              loading={dataDumpLoading}
              disabled={dataDumpLoading}
              onClick={handleDumpStarRailData}
              icon={<Play className="h-4 w-4 fill-current" />}
            >
              {dataDumpLoading
                ? (isTh ? `กำลัง Dump... (${elapsedSec}s)` : `Dumping... (${elapsedSec}s)`)
                : (isTh ? 'เริ่ม Dump StarRail_Data' : 'Dump StarRail_Data')}
            </Button>
          </div>
        </div>

        {/* Status result if completed */}
        {dataDumpResult && (
          <div className="pt-3 border-t border-hz-navy-500 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-hz-navy-900/80 border border-hz-navy-500/50">
                <span className="text-[10px] text-hz-gray-400 block">Config/</span>
                <span className="text-sm font-bold font-mono text-zinc-200">{dataDumpResult.configCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-hz-navy-900/80 border border-hz-navy-500/50">
                <span className="text-[10px] text-hz-gray-400 block">ExcelOutput/</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{dataDumpResult.excelCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-hz-navy-900/80 border border-hz-navy-500/50">
                <span className="text-[10px] text-hz-gray-400 block">Stages/</span>
                <span className="text-sm font-bold font-mono text-zinc-300">{dataDumpResult.stagesCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-hz-navy-900/80 border border-hz-navy-500/50">
                <span className="text-[10px] text-hz-gray-400 block">Story/</span>
                <span className="text-sm font-bold font-mono text-zinc-300">{dataDumpResult.storyCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-hz-navy-900/80 border border-hz-navy-500/50">
                <span className="text-[10px] text-hz-gray-400 block">TextMap/</span>
                <span className="text-sm font-bold font-mono text-amber-300">{dataDumpResult.textmapCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-hz-navy-900/80 border border-hz-navy-500/50">
                <span className="text-[10px] text-hz-gray-400 block">Process Time</span>
                <span className="text-sm font-bold font-mono text-white flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-hz-orange-400" /> {dataDumpResult.timeSeconds}s
                </span>
              </div>
            </div>

            {dataDumpResult.rawDir && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-[11px] text-rose-300 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="rose" className="text-[9px]">RAW FOLDER SEPARATED</Badge>
                  <span>{isTh ? 'ไฟล์ไบนารีดิบแยกไว้ที่โฟลเดอร์:' : 'Raw binaries isolated at:'} <code className="font-mono text-white">{dataDumpResult.rawDir}</code></span>
                </div>
                <span className="text-[10px] text-hz-gray-500">{isTh ? 'โครงสร้าง Dimbreath สะอาด 100%' : 'Dimbreath structure kept 100% pristine'}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Pipeline grid for In-Memory Dumper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-hz-gray-400 px-1">
          <span className="font-semibold text-hz-gray-400 uppercase tracking-wider text-[11px]">
            {isTh ? 'โหมด Live Memory Stream (ดึงโครงสร้างตรงจากหน่วยความจำ)' : 'Live Memory Stream Pipelines'}
          </span>
          {activeTaskRunning && (
            <span className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              {isTh ? `กำลังประมวลผล ${activeTaskRunning}... (${elapsedSec}s)` : `Processing ${activeTaskRunning}... (${elapsedSec}s)`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {TASKS.map((task) => {
            const key = dumperJobKey(task.action);
            const job = dumperJobs[key] || { status: 'idle' };
            const status = job.status;
            const Icon = task.icon;

            return (
              <Card key={task.id} className="p-4 bg-zinc-900/50 border-zinc-800/80 flex flex-col justify-between h-full relative group min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-2.5 rounded-xl border transition-colors shrink-0',
                          status === 'running'
                            ? 'bg-white/10 border-white/20 text-white animate-pulse'
                            : status === 'done'
                              ? 'bg-hz-green-400/15 border-hz-green-400/25 text-hz-green-400'
                              : status === 'failed'
                                ? 'bg-hz-red-400/15 border-hz-red-400/25 text-hz-red-400'
                                : 'bg-hz-navy-900 border-hz-navy-500 text-hz-gray-300'
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-white truncate">{t(task.titleKey)}</h3>
                        <p className="text-[11px] text-hz-gray-400 mt-0.5 line-clamp-2">{t(task.descKey)}</p>
                      </div>
                    </div>

                    {status === 'done' ? (
                      <Badge variant="emerald" className="shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> {job?.seconds ?? '?'}s
                      </Badge>
                    ) : status === 'failed' ? (
                      <Badge variant="rose" className="shrink-0">
                        <XCircle className="h-3 w-3" /> {t('status.failed')}
                      </Badge>
                    ) : status === 'running' ? (
                      <Badge variant="violet" dot className="shrink-0">
                        {isTh ? `กำลัง Dump (${elapsedSec}s)` : `Dumping (${elapsedSec}s)`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                        {task.approxSize}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-hz-navy-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-mono text-hz-gray-400 truncate">{task.output}</span>
                    <span className="text-[10px] text-hz-gray-500 shrink-0">({task.approxSize})</span>
                  </div>
                  <Button
                    variant={status === 'done' ? 'secondary' : !gameHookConnected ? 'secondary' : 'primary'}
                    size="xs"
                    loading={status === 'running'}
                    disabled={(!gameHookConnected || dumperRunning || dataDumpLoading) && status !== 'running'}
                    onClick={() => handleRunDumper(task)}
                    icon={status === 'done' ? <RotateCcw className="h-3 w-3" /> : undefined}
                    className="shrink-0 w-full sm:w-auto font-medium"
                  >
                    {status === 'done'
                      ? t('btn.rerun')
                      : !gameHookConnected
                        ? (isTh ? 'Dump สด (รอเปิดเกม)' : 'Live Dump (Waiting Game)')
                        : (isTh ? 'Dump สด' : 'Live Dump')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Artifacts summary pill box */}
      <Card className="p-3 bg-hz-navy-900/60 border border-hz-navy-500/50 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-hz-gray-400 mr-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            {isTh ? 'โฟลเดอร์ผลลัพธ์:' : 'Dump Artifacts:'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-hz-navy-800 border border-hz-navy-500 font-mono text-[10px] text-emerald-300">
            dump.cs (~28MB)
          </span>
          <span className="px-2 py-0.5 rounded-md bg-hz-navy-800 border border-hz-navy-500 font-mono text-[10px] text-zinc-300">
            StarRail.proto (~1.4MB)
          </span>
          <span className="px-2 py-0.5 rounded-md bg-hz-navy-800 border border-hz-navy-500 font-mono text-[10px] text-zinc-300">
            il2cpp.h (~3.2MB)
          </span>
          <span className="px-2 py-0.5 rounded-md bg-hz-navy-800 border border-hz-navy-500 font-mono text-[10px] text-amber-300">
            StarRail_Data/ (Config, Excel, Stages, Story, TextMap)
          </span>
          {preserveRaw && (
            <span className="px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-500/30 font-mono text-[10px] text-rose-300">
              RAW/ (Separated Binaries & Dat)
            </span>
          )}
        </div>

        <Button variant="secondary" size="xs" onClick={handleOpenInExplorer} icon={<FolderOpen className="h-3.5 w-3.5" />}>
          {isTh ? 'เปิดโฟลเดอร์ใน Explorer' : 'Open in Explorer'}
        </Button>
      </Card>

      {/* Advanced Filterable Output Log Terminal */}
      <Card className="flex flex-col p-4 text-xs overflow-hidden space-y-3 font-mono shadow-lg shadow-black/20" flat>
        <div className="flex items-center justify-between pb-2.5 border-b border-hz-navy-500/40 text-white flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-white tracking-wide">{t('dumper.output_stream')}</span>
            <span className="text-[10px] text-hz-gray-500 font-normal ml-1">
              ({filteredLogs.length} / {parsedLogs.length} {isTh ? 'บรรทัด' : 'lines'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <label className="flex items-center gap-1 text-[11px] text-hz-gray-500 cursor-pointer mr-2 select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-hz-navy-500 bg-hz-navy-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span>{isTh ? 'เลื่อนอัตโนมัติ' : 'Auto-scroll'}</span>
            </label>

            <Button
              variant="ghost"
              size="xs"
              onClick={handleCopyLogs}
              icon={copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-hz-gray-500" />}
            >
              {copied ? (isTh ? 'คัดลอกแล้ว' : 'Copied!') : (isTh ? 'คัดลอก' : 'Copy')}
            </Button>

            <Button
              variant="ghost"
              size="xs"
              onClick={handleExportLogs}
              icon={<FileDown className="h-3 w-3 text-hz-gray-500" />}
            >
              {isTh ? 'ส่งออก .txt' : 'Export .txt'}
            </Button>

            <Button
              variant="ghost"
              size="xs"
              onClick={handleClearLogs}
              icon={<Trash2 className="h-3 w-3 text-rose-400" />}
            >
              {isTh ? 'ล้าง' : 'Clear'}
            </Button>
          </div>
        </div>

        {/* Filter Toolbar: Category Tabs + Search Input */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-hz-navy-900/90 p-2 rounded-xl border border-hz-navy-500/40">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'all'
                  ? 'bg-hz-navy-700 text-white shadow-sm border border-hz-navy-500'
                  : 'text-hz-gray-500 hover:text-white hover:bg-hz-navy-800/60'
              )}
            >
              <Terminal className="h-3 w-3 text-hz-gray-500" />
              <span>{isTh ? 'ทั้งหมด' : 'All'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-hz-navy-800 text-hz-gray-400 font-mono border border-hz-navy-500">
                {logCounts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('extract')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'extract'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-600'
                  : 'text-hz-gray-500 hover:text-white hover:bg-hz-navy-800/60'
              )}
            >
              <Layers className="h-3 w-3 text-zinc-300" />
              <span>{isTh ? 'การสกัด' : 'Extract'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                {logCounts.extract}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('success')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 shadow-sm border border-emerald-500/40'
                  : 'text-hz-gray-500 hover:text-emerald-300 hover:bg-hz-navy-800/60'
              )}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>{isTh ? 'สำเร็จ' : 'Success'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-900/40 text-emerald-300 font-mono border border-emerald-700/40">
                {logCounts.success}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'errors'
                  ? 'bg-rose-950/60 text-rose-300 shadow-sm border border-rose-500/40'
                  : 'text-hz-gray-500 hover:text-rose-300 hover:bg-hz-navy-800/60'
              )}
            >
              <AlertTriangle className="h-3 w-3 text-rose-400" />
              <span>{isTh ? 'ข้อผิดพลาด' : 'Errors'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-900/40 text-rose-300 font-mono border border-rose-700/40">
                {logCounts.errors}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('raw')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'raw'
                  ? 'bg-white/10 text-white shadow-sm border border-white/20'
                  : 'text-hz-gray-400 hover:text-white hover:bg-hz-navy-800/60'
              )}
            >
              <Binary className="h-3 w-3 text-zinc-300" />
              <span>{isTh ? 'ไฟล์ดิบ RAW' : 'RAW'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/10 text-white font-mono border border-white/20">
                {logCounts.raw}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-hz-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTh ? 'ค้นหาข้อความ Log...' : 'Filter logs in real-time...'}
              className="w-full pl-8 pr-3 py-1 bg-hz-navy-850 border border-hz-navy-500/50 rounded-lg text-[11px] text-ink-2 placeholder:text-hz-gray-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600/40 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-hz-gray-500 hover:text-white text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Log Viewer Container */}
        <div
          ref={logRef}
          className="min-h-[280px] h-72 overflow-y-auto space-y-1 text-[11px] p-3 rounded-xl bg-hz-navy-850 border border-hz-navy-500/50 scrollbar-thin"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-hz-gray-500 italic text-[11px] py-6">
              <Filter className="h-4 w-4 mr-2 opacity-50" />
              {isTh ? 'ไม่พบข้อความ Log ที่ตรงกับตัวกรอง' : 'No log messages match the current filter.'}
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-2 break-all font-mono leading-relaxed py-0.5 px-1.5 rounded transition-colors',
                  item.category === 'success' && 'text-emerald-300 bg-emerald-950/15 font-medium',
                  item.category === 'errors' && 'text-rose-300 bg-rose-950/20 font-semibold',
                  item.category === 'extract' && 'text-zinc-300',
                  item.category === 'raw' && 'text-zinc-300',
                  item.category === 'info' && 'text-hz-gray-400'
                )}
              >
                <span className="text-hz-gray-600 select-none text-[10px] w-6 text-right shrink-0">
                  {item.id}
                </span>

                {item.category === 'success' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    OK
                  </span>
                )}
                {item.category === 'errors' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                    ERR
                  </span>
                )}
                {item.category === 'raw' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-white/10 text-zinc-200 border border-white/20 shrink-0">
                    RAW
                  </span>
                )}
                {item.category === 'extract' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-zinc-700/40 text-zinc-200 border border-zinc-600/50 shrink-0">
                    DATA
                  </span>
                )}

                <span className="flex-1">{item.text}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-hz-navy-500/40 flex justify-between items-center text-xs text-hz-gray-400 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span>{isTh ? 'โฟลเดอร์ผลลัพธ์ (Project Root):' : 'Output Location (Project Root):'}</span>
            <code className="text-emerald-400 font-mono bg-hz-navy-900 px-2.5 py-0.5 rounded-lg border border-hz-navy-500">
              ./DUMP/
            </code>
          </div>
          <Button variant="secondary" size="xs" onClick={handleOpenInExplorer} icon={<FolderDown className="h-3.5 w-3.5" />}>
            {isTh ? 'เปิดโฟลเดอร์ DUMP' : 'Reveal DUMP Directory'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
