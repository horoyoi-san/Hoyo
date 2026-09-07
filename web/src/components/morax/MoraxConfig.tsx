import { Layers, FolderOpen } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { useT } from '../../lib/hooks';

interface MoraxConfigProps {
  assemblyFile: string;
  setAssemblyFile: (val: string) => void;
  metadataFile: string;
  setMetadataFile: (val: string) => void;
  methodsJsonFile: string;
  setMethodsJsonFile: (val: string) => void;
  dumpCsFile: string;
  setDumpCsFile: (val: string) => void;
  outputDir: string;
  setOutputDir: (val: string) => void;
  onBrowseAssembly: () => void;
  onBrowseMetadata: () => void;
  onBrowseMethods: () => void;
  onBrowseDumpCs: () => void;
}

export function MoraxConfig({
  assemblyFile,
  setAssemblyFile,
  metadataFile,
  setMetadataFile,
  methodsJsonFile,
  setMethodsJsonFile,
  dumpCsFile,
  setDumpCsFile,
  outputDir,
  setOutputDir,
  onBrowseAssembly,
  onBrowseMetadata,
  onBrowseMethods,
  onBrowseDumpCs,
}: MoraxConfigProps) {
  const { isTh } = useT();

  return (
    <Card className="p-5 border-zinc-800 bg-hz-navy-800/80 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 text-white">
          <Layers className="h-4 w-4 text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            {isTh ? 'การตั้งค่าไฟล์ต้นทาง (Target Inputs)' : 'Target Binary Inputs'}
          </h2>
        </div>
        <span className="text-[11px] text-zinc-400">
          {isTh ? 'สแกนอัตโนมัติจาก Game Directory' : 'Auto-detected from Game Directory'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">GameAssembly.dll</label>
          <div className="flex gap-2">
            <Input
              value={assemblyFile}
              onChange={(e) => setAssemblyFile(e.target.value)}
              className="font-mono text-xs flex-1 min-w-0"
              placeholder="D:/StarRail/GameAssembly.dll"
            />
            <Button variant="secondary" size="sm" onClick={onBrowseAssembly} className="shrink-0 px-3">
              <FolderOpen className="h-4 w-4 mr-1.5" />
              <span>{isTh ? 'เลือกไฟล์' : 'Browse'}</span>
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">global-metadata.dat</label>
          <div className="flex gap-2">
            <Input
              value={metadataFile}
              onChange={(e) => setMetadataFile(e.target.value)}
              className="font-mono text-xs flex-1 min-w-0"
              placeholder="D:/StarRail/StarRail_Data/il2cpp_data/Metadata/global-metadata.dat"
            />
            <Button variant="secondary" size="sm" onClick={onBrowseMetadata} className="shrink-0 px-3">
              <FolderOpen className="h-4 w-4 mr-1.5" />
              <span>{isTh ? 'เลือกไฟล์' : 'Browse'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div>
          <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">methods.json</label>
          <div className="flex gap-2">
            <Input
              value={methodsJsonFile}
              onChange={(e) => setMethodsJsonFile(e.target.value)}
              className="font-mono text-xs flex-1 min-w-0"
              placeholder="./DUMP/Morax_Static/methods.json"
            />
            <Button variant="secondary" size="sm" onClick={onBrowseMethods} className="shrink-0">
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">dump.cs</label>
          <div className="flex gap-2">
            <Input
              value={dumpCsFile}
              onChange={(e) => setDumpCsFile(e.target.value)}
              className="font-mono text-xs flex-1 min-w-0"
              placeholder="./DUMP/Morax_Static/dump.cs"
            />
            <Button variant="secondary" size="sm" onClick={onBrowseDumpCs} className="shrink-0">
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-hz-gray-400 block mb-1.5 font-medium">
            {isTh ? 'โฟลเดอร์บันทึก (Output Directory)' : 'Output Directory'}
          </label>
          <Input
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            className="font-mono text-xs"
            placeholder="./DUMP/Morax_Static"
          />
        </div>
      </div>
    </Card>
  );
}
