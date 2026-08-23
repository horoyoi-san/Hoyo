import { Cpu, Server, Play, Square, RotateCcw, Download, Gamepad2, FolderOpen, FolderDown } from 'lucide-react';
import { Card, Badge, Button, Input } from '../ui';
import { cn } from '../../lib/utils';
import { PatchStatus } from '../../lib/tauri';

interface RobinSrActionsProps {
  isTh: boolean;
  dumpStatus: { synced: boolean };
  ingestBusy: boolean;
  handleIngestDump: () => void;
  serverOn: boolean;
  dispatchPort: string | number;
  gameserverPort: string | number;
  serverBusy: boolean;
  handleToggleServer: () => void;
  handleResetPosition: () => void;
  patchReady: boolean | undefined;
  patchBusy: boolean;
  handleInstallPatch: () => void;
  patch: PatchStatus | null;
  launchBusy: boolean;
  handleLaunchGame: () => void;
  gamePath: string;
  updateSettings: (s: { gamePath?: string }) => void;
  handleBrowseGamePath: () => void;
  handleOpenInExplorer: () => void;
}

export function RobinSrActions({
  isTh,
  dumpStatus,
  ingestBusy,
  handleIngestDump,
  serverOn,
  dispatchPort,
  gameserverPort,
  serverBusy,
  handleToggleServer,
  handleResetPosition,
  patchReady,
  patchBusy,
  handleInstallPatch,
  patch,
  launchBusy,
  handleLaunchGame,
  gamePath,
  updateSettings,
  handleBrowseGamePath,
  handleOpenInExplorer,
}: RobinSrActionsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Function 1: Ingest DUMP */}
        <Card className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-hz-orange-400/15 text-hz-orange-400">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  {isTh ? '1. ทำ Server จาก DUMP' : '1. Ingest DUMP'}
                </h3>
                <p className="text-[11px] text-hz-gray-400">
                  Opcodes & Protobuf
                </p>
              </div>
            </div>
            <Badge variant={dumpStatus.synced ? 'emerald' : 'amber'}>
              {dumpStatus.synced ? 'SYNCED' : 'READY'}
            </Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={ingestBusy}
            onClick={handleIngestDump}
            icon={<Cpu className="h-3.5 w-3.5 text-hz-orange-400" />}
            className="w-full"
          >
            {dumpStatus.synced
              ? (isTh ? 'ซิงค์ DUMP อีกครั้ง' : 'Re-Sync DUMP')
              : (isTh ? 'ทำ Server จาก DUMP' : 'Build from DUMP')}
          </Button>
        </Card>

        {/* Function 2: Server Engine */}
        <Card className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn('p-2 rounded-xl', serverOn ? 'bg-hz-green-400/15 text-hz-green-400' : 'bg-hz-brand-400/15 text-hz-brand-300')}>
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  {isTh ? '2. เซิร์ฟเวอร์ RobinSR' : '2. RobinSR Engine'}
                </h3>
                <p className="text-[11px] text-hz-gray-400">
                  :{dispatchPort} & :{gameserverPort}
                </p>
              </div>
            </div>
            <Badge variant={serverOn ? 'emerald' : 'neutral'} dot={serverOn}>
              {serverOn ? 'RUNNING' : 'STOPPED'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant={serverOn ? 'destructive' : 'emerald'}
              size="sm"
              loading={serverBusy}
              onClick={handleToggleServer}
              icon={serverOn ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              className="flex-1"
            >
              {serverOn
                ? (isTh ? 'ปิดเซิร์ฟเวอร์' : 'Stop Server')
                : (isTh ? 'เปิดเซิร์ฟเวอร์' : 'Start Server')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPosition}
              title={isTh ? 'รีเซ็ตตำแหน่งตัวละคร (ลบ persistent)' : 'Reset player spawn position'}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              {isTh ? 'รีเซ็ต' : 'Reset'}
            </Button>
          </div>
        </Card>

        {/* Function 3: Redirect Patch */}
        <Card className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-hz-brand-400/15 text-hz-brand-300">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  {isTh ? '3. ติดตั้ง Patch' : '3. Redirect Patch'}
                </h3>
                <p className="text-[11px] text-hz-gray-400">
                  hkrpg.dll & launcher
                </p>
              </div>
            </div>
            <Badge variant={patchReady ? 'emerald' : 'amber'}>
              {patchReady ? 'INSTALLED' : 'NOT INSTALLED'}
            </Badge>
          </div>
          <Button
            variant={patchReady ? 'secondary' : 'primary'}
            size="sm"
            loading={patchBusy}
            onClick={handleInstallPatch}
            icon={<Download className="h-3.5 w-3.5" />}
            className="w-full"
          >
            {patchReady
              ? (isTh ? 'ติดตั้ง Patch ซ้ำ' : 'Reinstall Patch')
              : (isTh ? 'ติดตั้งไฟล์ Patch' : 'Install Patch')}
          </Button>
        </Card>

        {/* Function 4: Launch Game */}
        <Card className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-hz-brand-400/15 text-hz-brand-300">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  {isTh ? '4. ตัวเกม Star Rail' : '4. Star Rail Client'}
                </h3>
                <p className="text-[11px] text-hz-gray-400 truncate">
                  {patch?.gameExePresent ? 'StarRail.exe Ready' : 'Select Game Folder'}
                </p>
              </div>
            </div>
            <Badge variant={patch?.gameExePresent ? 'emerald' : 'neutral'}>
              {patch?.gameExePresent ? 'READY' : 'NOT FOUND'}
            </Badge>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={launchBusy}
            onClick={handleLaunchGame}
            icon={<Gamepad2 className="h-3.5 w-3.5" />}
            className="w-full font-bold"
          >
            {launchBusy
              ? (isTh ? 'กำลังเปิดเกม...' : 'Launching...')
              : (isTh ? 'เปิดเข้าเล่นเกม' : 'Launch Game')}
          </Button>
        </Card>
      </div>

      {/* Game Directory Quick Bar */}
      <div className="bg-hz-navy-700 border border-hz-navy-500/40 rounded-[20px] p-3 flex flex-col sm:flex-row items-center gap-3 shrink-0 shadow-md shadow-black/20">
        <div className="flex items-center gap-2 text-xs font-bold text-hz-gray-400 shrink-0">
          <FolderOpen className="h-4 w-4 text-hz-brand-400" />
          <span>{isTh ? 'โฟลเดอร์ตัวเกม:' : 'Game Folder:'}</span>
        </div>
        <Input
          value={gamePath}
          onChange={(e) => updateSettings({ gamePath: e.target.value })}
          className="font-mono text-xs flex-1 h-8 bg-hz-navy-900 border-hz-navy-500"
          placeholder="C:/Program Files/Star Rail/Games"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="xs" onClick={handleBrowseGamePath} icon={<FolderOpen className="h-3.5 w-3.5" />}>
            {isTh ? 'เลือกโฟลเดอร์' : 'Browse'}
          </Button>
          <Button variant="outline" size="xs" onClick={handleOpenInExplorer} icon={<FolderDown className="h-3.5 w-3.5" />}>
            {isTh ? 'เปิด Explorer' : 'Open'}
          </Button>
        </div>
      </div>
    </>
  );
}
