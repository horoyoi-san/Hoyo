import { Layers } from 'lucide-react';
import { Badge, SectionHeader } from '../ui';
import { usePatcher } from './usePatcher';
import { PatcherStatusCards } from './PatcherStatusCards';
import { PatcherActions } from './PatcherActions';
import { PatcherTerminal } from './PatcherTerminal';

export function PatcherView() {
  const patcher = usePatcher();
  const { isTh } = patcher;

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5 bg-hz-navy-900">
      <SectionHeader
        icon={<Layers className="h-5 w-5" />}
        title={isTh ? 'Binary Patch & Hook Manager' : 'Binary Patch & Hook Manager'}
        badge={<Badge variant="amber">HDiff Delta Engine + Anti-Rename</Badge>}
        description={
          isTh
            ? 'ปรับใช้การอัปเดตไบนารีระดับเดลต้า (HDiff) และจัดการสถานะการล็อกของโมดูล version.dll'
            : 'Apply binary delta patches (HDiff) and manage client version.dll hook states.'
        }
      />

      {/* Top Status Cards */}
      <PatcherStatusCards isTh={isTh} patchStatus={patcher.patchStatus} />

      {/* Main Dual Cards */}
      <PatcherActions
        isTh={isTh}
        gamePath={patcher.gamePath}
        patchFile={patcher.patchFile}
        setPatchFile={patcher.setPatchFile}
        patchLoading={patcher.patchLoading}
        rollbackLoading={patcher.rollbackLoading}
        deployLoading={patcher.deployLoading}
        statusLoading={patcher.statusLoading}
        patchStatus={patcher.patchStatus}
        handleBrowseGamePath={patcher.handleBrowseGamePath}
        handleBrowsePatch={patcher.handleBrowsePatch}
        handleApplyPatch={patcher.handleApplyPatch}
        handleRollback={patcher.handleRollback}
        handleDeployDll={patcher.handleDeployDll}
        refreshStatus={patcher.refreshStatus}
      />

      {/* Execution Terminal */}
      <PatcherTerminal isTh={isTh} logs={patcher.logs} />
    </div>
  );
}
