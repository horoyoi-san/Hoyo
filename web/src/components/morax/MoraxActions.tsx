import { Code2, Binary, FolderDown, Play } from 'lucide-react';
import { Badge, Button, Card } from '../ui';
import { useT } from '../../lib/hooks';

interface MoraxActionsProps {
  activeTask: string | null;
  onRunMetadata: () => void;
  onRunProto: () => void;
  onRunDummy: () => void;
  onOpenExplorer: () => void;
}

export function MoraxActions({
  activeTask,
  onRunMetadata,
  onRunProto,
  onRunDummy,
  onOpenExplorer,
}: MoraxActionsProps) {
  const { isTh } = useT();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Action 1: IL2CPP Metadata Parser */}
      <Card className="p-3.5 border-zinc-800 bg-hz-navy-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <Code2 className="h-4 w-4" />
            </div>
            <Badge variant="neutral" className="text-[10px]">Metadata Engine</Badge>
          </div>
          <h3 className="text-xs font-bold text-white pt-1">
            {isTh ? '1. Metadata Parser' : '1. Metadata Parser'}
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isTh
              ? 'วิเคราะห์ global-metadata.dat เพื่อสร้าง dump.cs, methods.json และ il2cpp.h'
              : 'Parse global-metadata.dat to emit dump.cs, methods.json, and il2cpp.h.'}
          </p>
        </div>
        <div className="pt-3 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-400">14.8k Types</span>
          <Button
            variant="secondary"
            size="xs"
            loading={activeTask === 'metadata'}
            onClick={onRunMetadata}
            icon={<Play className="h-3 w-3 fill-current" />}
          >
            {isTh ? 'Parse' : 'Parse'}
          </Button>
        </div>
      </Card>

      {/* Action 2: Proto Engine */}
      <Card className="p-3.5 border-zinc-800 bg-hz-navy-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <Binary className="h-4 w-4" />
            </div>
            <Badge variant="neutral" className="text-[10px]">Proto Engine</Badge>
          </div>
          <h3 className="text-xs font-bold text-white pt-1">
            {isTh ? '2. Proto & CmdIDs' : '2. Proto & CmdIDs'}
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isTh
              ? 'แปลง methods.json + GameAssembly เป็น StarRail.proto & packetIds.json'
              : 'Convert methods.json + GameAssembly into clean StarRail.proto & packetIds.json.'}
          </p>
        </div>
        <div className="pt-3 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-400">512 Messages</span>
          <Button
            variant="secondary"
            size="xs"
            loading={activeTask === 'beta-proto'}
            onClick={onRunProto}
            icon={<Play className="h-3 w-3 fill-current" />}
          >
            {isTh ? 'Build' : 'Build'}
          </Button>
        </div>
      </Card>

      {/* Action 3: Dummy DLLs & Headers */}
      <Card className="p-3.5 border-zinc-800 bg-hz-navy-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <Code2 className="h-4 w-4" />
            </div>
            <Badge variant="neutral" className="text-[10px]">Dummy Engine</Badge>
          </div>
          <h3 className="text-xs font-bold text-white pt-1">
            {isTh ? '3. Dummy DLLs' : '3. Dummy DLLs'}
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isTh
              ? 'สร้าง il2cpp.h C++ structs และ Assembly-CSharp.dll จำลอง'
              : 'Generate il2cpp.h C++ structs & dummy Assembly-CSharp.dll.'}
          </p>
        </div>
        <div className="pt-3 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-400">il2cpp.h</span>
          <Button
            variant="secondary"
            size="xs"
            loading={activeTask === 'dummydlls'}
            onClick={onRunDummy}
            icon={<Play className="h-3 w-3 fill-current" />}
          >
            {isTh ? 'Generate' : 'Generate'}
          </Button>
        </div>
      </Card>

      {/* Action 4: Output Folder Quick Card */}
      <Card className="p-3.5 border-zinc-800 bg-hz-navy-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200">
              <FolderDown className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px]">Project Root</Badge>
          </div>
          <h3 className="text-xs font-bold text-white pt-1">
            {isTh ? '4. โฟลเดอร์ DUMP' : '4. DUMP Folder'}
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isTh
              ? 'เปิดโฟลเดอร์ผลลัพธ์เพื่อตรวจสอบไฟล์ Raw Metadata, Proto และ DLLs'
              : 'Open destination folder to inspect Raw Metadata, Proto, and DLLs.'}
          </p>
        </div>
        <div className="pt-3 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-400">./DUMP</span>
          <Button
            variant="secondary"
            size="xs"
            onClick={onOpenExplorer}
            icon={<FolderDown className="h-3 w-3" />}
          >
            {isTh ? 'เปิด Explorer' : 'Explore'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
