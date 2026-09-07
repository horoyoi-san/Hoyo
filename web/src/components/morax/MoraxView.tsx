import { Cpu, Sparkles } from 'lucide-react';
import { Badge, Button } from '../ui';
import { useT } from '../../lib/hooks';
import { useMorax } from './useMorax';
import { MoraxActions } from './MoraxActions';
import { MoraxConfig } from './MoraxConfig';
import { MoraxKPIs } from './MoraxKPIs';
import { MoraxTerminal } from './MoraxTerminal';

export function MoraxView() {
  const { isTh } = useT();
  const {
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
    activeTask,
    stats,
    logs,
    clearLogs,
    handleBrowseAssembly,
    handleBrowseMetadata,
    handleBrowseMethods,
    handleBrowseDumpCs,
    handleOpenInExplorer,
    handleRunMetadataParser,
    handleRunBetaProtoDump,
    handleRunDummyDlls,
    handleRunAllInOne,
  } = useMorax();

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5 bg-hz-navy-900">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-hz-navy-500/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-zinc-800 border border-zinc-700/60 text-zinc-200 shadow-sm">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white tracking-wide">
                Morax Metadata & Proto Engine
              </h1>
              <Badge variant="neutral">Dual Engine</Badge>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              {isTh
                ? 'ถอดรหัส IL2CPP Metadata, ดึงสกีมา Protobuf และคอมไพล์ Dummy Assemblies สำหรับการทำ Reverse Engineering'
                : 'IL2CPP metadata decryption, Protobuf schema extraction, and managed dummy assembly generation.'}
            </p>
          </div>
        </div>

        {/* 1-CLICK ALL-IN-ONE BUTTON */}
        <Button
          variant="primary"
          size="md"
          loading={activeTask === 'all-in-one'}
          onClick={handleRunAllInOne}
          icon={<Sparkles className="h-4 w-4 fill-current" />}
          className="font-semibold shrink-0 shadow-sm"
        >
          {activeTask === 'all-in-one'
            ? (isTh ? 'กำลังประมวลผลทั้งหมด...' : 'Processing All...')
            : (isTh ? '1-Click ถอดรหัสทั้งหมด' : '1-Click All-in-One Dump')}
        </Button>
      </div>

      {/* 4 Action Pipeline Cards */}
      <MoraxActions
        activeTask={activeTask}
        onRunMetadata={handleRunMetadataParser}
        onRunProto={handleRunBetaProtoDump}
        onRunDummy={handleRunDummyDlls}
        onOpenExplorer={handleOpenInExplorer}
      />

      {/* Target Resource Configuration Inputs */}
      <MoraxConfig
        assemblyFile={assemblyFile}
        setAssemblyFile={setAssemblyFile}
        metadataFile={metadataFile}
        setMetadataFile={setMetadataFile}
        methodsJsonFile={methodsJsonFile}
        setMethodsJsonFile={setMethodsJsonFile}
        dumpCsFile={dumpCsFile}
        setDumpCsFile={setDumpCsFile}
        outputDir={outputDir}
        setOutputDir={setOutputDir}
        onBrowseAssembly={handleBrowseAssembly}
        onBrowseMetadata={handleBrowseMetadata}
        onBrowseMethods={handleBrowseMethods}
        onBrowseDumpCs={handleBrowseDumpCs}
      />

      {/* KPIs & Results Summary */}
      <MoraxKPIs stats={stats} />

      {/* Terminal Log Stream */}
      <MoraxTerminal logs={logs} onOpenExplorer={handleOpenInExplorer} onClear={clearLogs} />
    </div>
  );
}
