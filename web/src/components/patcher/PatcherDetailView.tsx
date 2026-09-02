import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  FolderOpen,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Play,
  FileArchive,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Badge, Button, Card, Input, SectionHeader } from '../ui';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { isTauri, tauriApi, PatchStatus, HDiffResult } from '../../lib/tauri';
import { pickDirectory, pickFile } from '../../lib/filePicker';

export function PatcherDetailView() {
  const { isTh } = useT();
  const gamePath = useAppStore((state) => state.gamePath);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [patchFile, setPatchFile] = useState<string>('');
  const [patchLoading, setPatchLoading] = useState<boolean>(false);
  const [rollbackLoading, setRollbackLoading] = useState<boolean>(false);
  const [patchResult, setPatchResult] = useState<HDiffResult | null>(null);

  const [patchStatus, setPatchStatus] = useState<PatchStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [deployLoading, setDeployLoading] = useState<boolean>(false);

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs([
      isTh
        ? '[*] ระบบจัดการแพทช์เกมและตัวควบคุม DLL พร้อมทำงาน'
        : '[*] Game Patch Updater & DLL Manager Engine Ready.',
      isTh
        ? '[*] ระบบตรวจสอบและล็อกความปลอดภัย version.dll ป้องกันตัวเกมลบหรือเปลี่ยนชื่อไฟล์'
        : '[*] Security monitor and lock system active for version.dll',
      isTh
        ? '[*] เลือกไฟล์แพทช์ .hdiff, .patch, .zip หรือ .7z แล้วกดปุ่ม "เริ่มติดตั้งแพทช์" ได้ทันที'
        : '[*] Select patch archive (.hdiff, .patch, .zip, .7z) and click "Apply Patch" to proceed',
    ]);
  }, [isTh]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const refreshStatus = useCallback(async () => {
    if (isTauri() && gamePath) {
      setStatusLoading(true);
      try {
        const s = await tauriApi.checkPatch(gamePath);
        setPatchStatus(s);
      } catch (e) {
        console.debug('Failed to check patch status:', e);
      }
      setStatusLoading(false);
    }
  }, [gamePath]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleBrowseGamePath = async () => {
    const p = await pickDirectory();
    if (p) {
      updateSettings({ gamePath: p });
      addLog(isTh ? `[*] เลือกโฟลเดอร์ตัวเกม: ${p}` : `[*] Selected Game Directory: ${p}`);
    }
  };

  const handleBrowsePatch = async () => {
    const p = await pickFile(['.hdiff', '.patch', '.zip', '.7z', '.rar']);
    if (p) {
      setPatchFile(p);
      addLog(isTh ? `[*] เลือกไฟล์แพทช์: ${p}` : `[*] Selected Patch File: ${p}`);
    }
  };

  const handleDeployDll = async () => {
    if (!gamePath) return;
    setDeployLoading(true);
    addLog(isTh ? '[*] กำลังติดตั้งและล็อก version.dll ในโฟลเดอร์ตัวเกม...' : '[*] Deploying & locking version.dll in game folder...');

    if (isTauri()) {
      try {
        const res = await tauriApi.installPatch(gamePath);
        setPatchStatus(res);
        addLog(isTh ? '[OK] ติดตั้งและล็อก version.dll สำเร็จ พร้อมเข้าเล่นเกม!' : '[OK] version.dll deployed & locked successfully!');
      } catch (e) {
        addLog(`[ERR] Error: ${e}`);
      }
    }
    setDeployLoading(false);
  };

  const handleApplyPatch = async () => {
    if (!gamePath || !patchFile) return;
    setPatchLoading(true);
    setPatchResult(null);
    addLog(isTh ? `[*] กำลังเริ่มกระบวนการลงแพทช์ไฟล์: ${patchFile}...` : `[*] Applying delta patch: ${patchFile}...`);

    if (isTauri()) {
      try {
        const res = await tauriApi.executeApplyPatch(gamePath, patchFile);
        setPatchResult(res);
        addLog(isTh ? `[OK] ${res.message}` : `[OK] ${res.message}`);
        await refreshStatus();
      } catch (e) {
        addLog(`[ERR] Patch Error: ${e}`);
      }
    } else {
      setTimeout(() => {
        const mock: HDiffResult = {
          success: true,
          filesPatched: 12,
          totalBytesProcessed: 48500000,
          timeSeconds: 1.45,
          message: 'Patch applied successfully: 12 file(s) processed (46.25 MB) in 1.45s',
        };
        setPatchResult(mock);
        addLog(`[OK] [Dev Mode] ${mock.message}`);
        setPatchLoading(false);
      }, 800);
      return;
    }
    setPatchLoading(false);
  };

  const handleRollbackPatch = async () => {
    if (!gamePath) return;
    setRollbackLoading(true);
    addLog(isTh ? '[*] กำลัง Rollback ไฟล์เกมจาก Snapshot Backup ล่าสุด...' : '[*] Rolling back game binaries from latest snapshot backup...');
    if (isTauri()) {
      try {
        const res = await tauriApi.rollbackHdiffPatch(gamePath);
        setPatchResult(res);
        addLog(isTh ? `[OK] ${res.message}` : `[OK] ${res.message}`);
        await refreshStatus();
      } catch (e) {
        addLog(`[ERR] Rollback Error: ${e}`);
      }
    } else {
      setTimeout(() => {
        const mock: HDiffResult = {
          success: true,
          filesPatched: 5,
          totalBytesProcessed: 125000000,
          timeSeconds: 0.82,
          message: 'Rollback completed: 5 file(s) restored (119.21 MB) in 0.82s',
        };
        setPatchResult(mock);
        addLog(`[OK] [Dev Mode] ${mock.message}`);
        setRollbackLoading(false);
      }, 500);
      return;
    }
    setRollbackLoading(false);
  };

  const handleLaunchGame = async () => {
    if (!gamePath) return;
    addLog(isTh ? '[*] กำลังเปิดตัวเกม Star Rail...' : '[*] Launching Star Rail Client...');
    if (isTauri()) {
      try {
        await tauriApi.launchGame(gamePath);
        addLog(isTh ? '[OK] เปิดเกมสำเร็จ พร้อมใช้งาน Hook DLL' : '[OK] Game launched with active Hook DLL');
      } catch (e) {
        addLog(`[ERR] Launch Error: ${e}`);
      }
    }
  };

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto bg-hz-navy-900">
      <SectionHeader
        icon={<Layers className="h-5 w-5" />}
        title={isTh ? 'ระบบอัปเดตแพทช์เกม & ตัวจัดการ DLL' : 'Game Patch Updater & DLL Manager'}
        badge={<Badge variant="amber">Delta Stream</Badge>}
        description={
          isTh
            ? 'อัปเกรดเวอร์ชันเกมด้วยไฟล์ดิฟฟ์ขนาดเล็ก ปลอดภัย พร้อมระบบล็อกและกู้คืน version.dll อัตโนมัติ'
            : 'High-performance binary patch applier and anticheat hook lock protector.'
        }
      />

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'สถานะ Hook DLL (version.dll)' : 'Hook DLL Status'}
            </span>
            <ShieldCheck className={`h-4 w-4 ${patchStatus?.dllPresent ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={patchStatus?.dllPresent ? 'emerald' : 'amber'} dot={patchStatus?.dllPresent}>
              {patchStatus?.dllPresent
                ? (isTh ? 'ติดตั้งแล้ว (ล็อกไฟล์)' : 'INSTALLED & LOCKED')
                : (isTh ? 'ยังไม่ได้ติดตั้ง' : 'NOT INSTALLED')}
            </Badge>
          </div>
        </Card>

        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'สถานะตัวเกม (StarRail.exe)' : 'Game Client Executable'}
            </span>
            <Play className={`h-4 w-4 ${patchStatus?.gameExePresent ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={patchStatus?.gameExePresent ? 'emerald' : 'rose'}>
              {patchStatus?.gameExePresent
                ? (isTh ? 'พร้อมใช้งาน' : 'READY TO PLAY')
                : (isTh ? 'ไม่พบไฟล์ StarRail.exe' : 'STARRAIL.EXE NOT FOUND')}
            </Badge>
          </div>
        </Card>

        <Card className="p-4 bg-hz-navy-800/80 border-hz-navy-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-hz-gray-400">
              {isTh ? 'การป้องกันไฟล์' : 'Protection Level'}
            </span>
            <Lock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{isTh ? 'Read-Only Anti-Rename' : 'Read-Only Anti-Rename'}</span>
          </div>
        </Card>
      </div>

      {/* Main Dual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: HDiff Delta Patch Updater */}
        <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400">
                <FileArchive className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isTh ? 'อัปเดตแพทช์ตัวเกม (HDiff Patch Applier)' : 'HDiff Game Patch Updater'}
                </h2>
                <p className="text-xs text-hz-gray-400">
                  {isTh ? 'นำเข้าไฟล์ดิฟฟ์ .hdiff หรือ .zip เพื่ออัปเกรดเวอร์ชัน' : 'Import delta files to update game client.'}
                </p>
              </div>
            </div>
            <Badge variant="amber">HDiff Engine</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">
                {isTh ? 'โฟลเดอร์ตัวเกม (Game Directory)' : 'Game Directory'}
              </label>
              <div className="flex gap-2">
                <Input
                  value={gamePath || ''}
                  onChange={(e) => updateSettings({ gamePath: e.target.value })}
                  className="font-mono text-xs flex-1"
                  placeholder="C:/Program Files/Star Rail/Games"
                />
                <Button variant="secondary" size="sm" onClick={handleBrowseGamePath} className="shrink-0 px-3">
                  <FolderOpen className="h-4 w-4 mr-1.5" />
                  <span>{isTh ? 'เลือกโฟลเดอร์' : 'Browse'}</span>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">
                {isTh ? 'ไฟล์แพทช์อัปเดต (.hdiff / .patch / .zip)' : 'Patch Archive File (.hdiff / .patch / .zip)'}
              </label>
              <div className="flex gap-2">
                <Input
                  value={patchFile || ''}
                  onChange={(e) => setPatchFile(e.target.value)}
                  className="font-mono text-xs flex-1"
                  placeholder="game_patch_4.4.x.hdiff"
                />
                <Button variant="secondary" size="sm" onClick={handleBrowsePatch} className="shrink-0 px-3">
                  <FolderOpen className="h-4 w-4 mr-1.5" />
                  <span>{isTh ? 'เลือกไฟล์' : 'Browse'}</span>
                </Button>
              </div>
            </div>

            {patchResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                {patchResult.message}
              </div>
            )}

            <div className="pt-2 flex justify-between items-center border-t border-hz-navy-500/40 gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={rollbackLoading}
                onClick={handleRollbackPatch}
                disabled={!gamePath || patchLoading}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                {isTh ? 'Rollback' : 'Rollback'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={patchLoading}
                onClick={handleApplyPatch}
                disabled={!gamePath || !patchFile || rollbackLoading}
                icon={<Zap className="h-3.5 w-3.5 fill-current" />}
              >
                {isTh ? 'เริ่มติดตั้งแพทช์' : 'Apply Patch'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Right: Hook DLL Deployment & Game Launcher */}
        <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isTh ? 'ตัวจัดการ Hook DLL & เริ่มเกม' : 'Hook DLL & Game Launcher'}
                </h2>
                <p className="text-xs text-hz-gray-400">
                  {isTh ? 'กู้คืนและล็อก version.dll พร้อมเปิดตัวเกม Star Rail' : 'Restore, lock, and launch game client with hook.'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="xs" onClick={refreshStatus} loading={statusLoading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-hz-gray-400">{isTh ? 'ไฟล์ Dumper Hook' : 'Hook Binary'}</span>
                <span className="font-mono text-zinc-200">bin/version.dll</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-hz-gray-400">{isTh ? 'เป้าหมายการติดตั้ง' : 'Deployment Target'}</span>
                <span className="font-mono text-zinc-200">GameDirectory/version.dll</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-hz-gray-400">{isTh ? 'แอตทริบิวต์ความปลอดภัย' : 'Security Attribute'}</span>
                <Badge variant="emerald">+R (Read-Only Locked)</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                variant="secondary"
                size="sm"
                loading={deployLoading}
                onClick={handleDeployDll}
                icon={<Lock className="h-3.5 w-3.5" />}
              >
                {isTh ? 'ติดตั้ง & ล็อก DLL' : 'Deploy & Lock DLL'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleLaunchGame}
                icon={<Play className="h-3.5 w-3.5 fill-current" />}
              >
                {isTh ? 'เปิดตัวเกมทันที' : 'Launch Game'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Execution Terminal */}
      <Card className="flex-1 min-h-48 p-4 flex flex-col font-mono text-xs space-y-2.5 shadow-lg shadow-black/20" flat>
        <div className="flex items-center justify-between pb-2.5 border-b border-hz-navy-500/40">
          <div className="flex items-center gap-2 text-white">
            <span className="font-bold text-xs">
              {isTh ? 'บันทึกการทำงานของ Patcher & Hook Manager' : 'Patcher & Hook Manager Output Stream'}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {logs.length} Events
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40 text-[11px] scrollbar-thin max-h-56">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`break-all font-mono leading-relaxed ${
                log.includes('[OK]') || log.includes('Successfully')
                  ? 'text-emerald-300 font-bold'
                  : log.includes('[*]') || log.includes('Applying') || log.includes('Launching')
                  ? 'text-cyan-300 font-semibold'
                  : log.includes('[ERR]')
                  ? 'text-rose-400 font-semibold'
                  : 'text-zinc-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
