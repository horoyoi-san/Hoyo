import { ShieldCheck, Play, Lock, CheckCircle2 } from 'lucide-react';
import { Badge, Card } from '../ui';
import { PatchStatus } from '../../lib/tauri';

interface PatcherStatusCardsProps {
  isTh: boolean;
  patchStatus: PatchStatus | null;
}

export function PatcherStatusCards({ isTh, patchStatus }: PatcherStatusCardsProps) {
  return (
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
          <Lock className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="text-sm font-bold text-white mt-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Read-Only Anti-Rename</span>
        </div>
      </Card>
    </div>
  );
}
