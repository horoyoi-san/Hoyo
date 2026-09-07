import { FileArchive, FolderOpen, Zap, RotateCcw, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { PatchStatus } from '../../lib/tauri';

interface PatcherActionsProps {
  isTh: boolean;
  gamePath: string;
  patchFile: string;
  setPatchFile: (v: string) => void;
  patchLoading: boolean;
  rollbackLoading: boolean;
  deployLoading: boolean;
  statusLoading: boolean;
  patchStatus: PatchStatus | null;
  handleBrowseGamePath: () => void;
  handleBrowsePatch: () => void;
  handleApplyPatch: () => void;
  handleRollback: () => void;
  handleDeployDll: () => void;
  refreshStatus: () => void;
}

export function PatcherActions({
  isTh,
  gamePath,
  patchFile,
  setPatchFile,
  patchLoading,
  rollbackLoading,
  deployLoading,
  statusLoading,
  patchStatus,
  handleBrowseGamePath,
  handleBrowsePatch,
  handleApplyPatch,
  handleRollback,
  handleDeployDll,
  refreshStatus,
}: PatcherActionsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left: HDiff Delta Patch Updater */}
      <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400">
              <FileArchive className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {isTh ? 'ติดตั้งแพทช์อัปเดตเวอร์ชัน (HDiff Patch)' : 'Delta Patch Applier'}
              </div>
              <div className="text-[11px] text-hz-gray-400">
                {isTh ? 'แพทช์ GameAssembly.dll ด้วยไฟล์ดิฟฟ์ขนาดเล็ก' : 'Apply small binary diffs to game client'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-hz-gray-400 block mb-1 font-medium">
              {isTh ? 'โฟลเดอร์ตัวเกม (Game Directory)' : 'Game Directory'}
            </label>
            <div className="flex gap-2">
              <Input
                value={gamePath || ''}
                readOnly
                placeholder="C:/Program Files/Star Rail/Games"
                className="font-mono text-xs flex-1 min-w-0"
              />
              <Button variant="secondary" size="sm" onClick={handleBrowseGamePath} className="shrink-0 px-3">
                <FolderOpen className="h-4 w-4 mr-1.5" />
                <span>{isTh ? 'เลือก' : 'Browse'}</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="text-hz-gray-400 block mb-1 font-medium">
              {isTh ? 'ไฟล์แพทช์ (.hdiff, .patch, .zip, .7z)' : 'Patch Archive'}
            </label>
            <div className="flex gap-2">
              <Input
                value={patchFile}
                onChange={(e) => setPatchFile(e.target.value)}
                placeholder="เลือกไฟล์ .hdiff, .patch หรือ zip..."
                className="font-mono text-xs flex-1 min-w-0"
              />
              <Button variant="secondary" size="sm" onClick={handleBrowsePatch} className="shrink-0 px-3">
                <FolderOpen className="h-4 w-4 mr-1.5" />
                <span>{isTh ? 'เลือกไฟล์' : 'Browse'}</span>
              </Button>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={patchLoading}
              onClick={handleApplyPatch}
              disabled={!gamePath || !patchFile}
              icon={<Zap className="h-4 w-4 fill-current" />}
              className="flex-1 font-bold"
            >
              {isTh ? 'เริ่มติดตั้งแพทช์' : 'Apply Patch'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={rollbackLoading}
              onClick={handleRollback}
              disabled={!gamePath}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              {isTh ? 'กู้คืน (Rollback)' : 'Rollback'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right: Hook DLL Management & Lock Protector */}
      <Card className="p-5 border-hz-navy-500/50 bg-hz-navy-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-hz-navy-500/40">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {isTh ? 'ระบบล็อกป้องกัน version.dll' : 'Hook DLL Protection & Lock'}
              </div>
              <div className="text-[11px] text-hz-gray-400">
                {isTh ? 'ป้องกันแอนตี้ชีตหรือตัวเกมลบ/เปลี่ยนชื่อ DLL ขณะเล่น' : 'Auto-lock version.dll with Read-Only security'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-hz-navy-900/60 border border-hz-navy-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-hz-gray-300 font-medium">version.dll in Game Root</span>
              <span className="font-mono text-emerald-400 font-bold">
                {patchStatus?.dllPresent ? 'ACTIVE (LOCKED)' : 'NOT DEPLOYED'}
              </span>
            </div>
            <p className="text-[11px] text-hz-gray-400 leading-relaxed">
              {isTh
                ? 'เมื่อกดติดตั้ง ระบบจะทำการคัดลอก Native Hook DLL ลงในโฟลเดอร์เกม พร้อมตั้งค่าแอตทริบิวต์ Read-Only อัตโนมัติ เพื่อป้องกันการถูกเขียนทับ'
                : 'Installs embedded version.dll directly to game directory and applies Read-Only lock to prevent client overwrites.'}
            </p>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={deployLoading}
              onClick={handleDeployDll}
              disabled={!gamePath}
              icon={<Lock className="h-4 w-4 text-zinc-300" />}
              className="flex-1"
            >
              {isTh ? 'ติดตั้ง & ล็อก version.dll' : 'Deploy & Lock DLL'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={statusLoading}
              onClick={refreshStatus}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              {isTh ? 'รีเฟรช' : 'Refresh'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
