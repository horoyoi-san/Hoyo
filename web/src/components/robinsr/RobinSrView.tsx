import { Server, FolderOpen, Zap } from 'lucide-react';
import { Button } from '../ui';
import { useRobinSr } from './useRobinSr';
import { RobinSrKPIs } from './RobinSrKPIs';
import { RobinSrActions } from './RobinSrActions';
import { RobinSrConsole } from './RobinSrConsole';

export function RobinSrView() {
  const state = useRobinSr();
  const { isTh, handleOpenDumpFolder, comboBusy, handleComboLaunch } = state;

  return (
    <div className="h-full flex flex-col bg-hz-navy-900 text-white select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 px-6 border-b border-hz-navy-500/40 flex items-center justify-between shrink-0 bg-hz-navy-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-hz-brand-400/20 text-hz-brand-300 border border-hz-brand-400/30 shadow-md shadow-hz-brand-400/10">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              RobinSR Server Engine
            </h1>
            <p className="text-[11px] text-hz-gray-400 font-medium">
              Autonomous Star Rail Server & Live Ingestion Pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDumpFolder}
            icon={<FolderOpen className="h-3.5 w-3.5 text-hz-gray-400" />}
          >
            {isTh ? 'เปิดโฟลเดอร์ DUMP' : 'Open ./DUMP'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            loading={comboBusy}
            onClick={handleComboLaunch}
            icon={<Zap className="h-3.5 w-3.5 fill-current" />}
            className="bg-hz-brand-400 hover:bg-hz-brand-500 font-bold px-4"
          >
            {isTh ? '1-Click เริ่มทำงาน' : '1-Click Launch'}
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <RobinSrKPIs
          dispatchPort={state.dispatchPort}
          gameserverPort={state.gameserverPort}
          serverOn={state.serverOn}
          dumpStatus={state.dumpStatus}
          patchReady={state.patchReady}
        />
        
        <RobinSrActions
          isTh={state.isTh}
          dumpStatus={state.dumpStatus}
          ingestBusy={state.ingestBusy}
          handleIngestDump={state.handleIngestDump}
          serverOn={state.serverOn}
          dispatchPort={state.dispatchPort}
          gameserverPort={state.gameserverPort}
          serverBusy={state.serverBusy}
          handleToggleServer={state.handleToggleServer}
          handleResetPosition={state.handleResetPosition}
          patchReady={state.patchReady}
          patchBusy={state.patchBusy}
          handleInstallPatch={state.handleInstallPatch}
          patch={state.patch}
          launchBusy={state.launchBusy}
          handleLaunchGame={state.handleLaunchGame}
          gamePath={state.gamePath}
          updateSettings={state.updateSettings}
          handleBrowseGamePath={state.handleBrowseGamePath}
          handleOpenInExplorer={state.handleOpenInExplorer}
        />

        <RobinSrConsole
          activeTab={state.activeTab}
          setActiveTab={state.setActiveTab}
          tabCounts={state.tabCounts}
          filteredLogs={state.filteredLogs}
          logs={state.logs}
          dispatchPort={state.dispatchPort}
          gameserverPort={state.gameserverPort}
          handleCopyLogs={state.handleCopyLogs}
          clearLogs={state.clearLogs}
          copied={state.copied}
          terminalEndRef={state.terminalEndRef}
        />
      </div>
    </div>
  );
}
