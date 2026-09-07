import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { isTauri, tauriApi, PatchStatus, HDiffResult } from '../../lib/tauri';
import { pickDirectory, pickFile } from '../../lib/filePicker';

export function usePatcher() {
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



  const addLog = (msg: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const refreshStatus = useCallback(async () => {
    if (!gamePath || !isTauri()) return;
    setStatusLoading(true);
    try {
      const s = await tauriApi.checkPatch(gamePath);
      setPatchStatus(s);
    } catch (e) {
      console.debug('Failed to check patch status:', e);
    } finally {
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
        addLog(isTh ? '[OK] ติดตั้งและล็อก version.dll สำเร็จ' : '[OK] version.dll deployed and locked successfully');
      } catch (e) {
        addLog(`[ERR] Error: ${e}`);
      }
    } else {
      setTimeout(() => {
        setPatchStatus({
          dllPresent: true,
          launcherPresent: true,
          dllModifiedSecs: Date.now() / 1000,
          launcherModifiedSecs: Date.now() / 1000,
          gameExePresent: true,
        });
        addLog('[OK] [Dev Mode] Mock deployment & lock success!');
        setDeployLoading(false);
      }, 500);
      return;
    }
    setDeployLoading(false);
  };

  const handleApplyPatch = async () => {
    if (!gamePath || !patchFile) return;
    setPatchLoading(true);
    addLog(isTh ? `[*] กำลังเริ่มต้นถอดรหัสและติดตั้งดิฟฟ์แพทช์: ${patchFile}...` : `[*] Applying delta patch from ${patchFile}...`);

    if (isTauri()) {
      try {
        const res = await tauriApi.executeApplyPatch(gamePath, patchFile);
        setPatchResult(res);
        addLog(isTh ? `[OK] ติดตั้งแพทช์สำเร็จ: ${res.message}` : `[OK] Patch applied successfully: ${res.message}`);
        refreshStatus();
      } catch (e) {
        addLog(`[ERR] Error applying patch: ${e}`);
      }
    } else {
      setTimeout(() => {
        const mock: HDiffResult = {
          success: true,
          filesPatched: 1,
          totalBytesProcessed: 1048576,
          timeSeconds: 1.25,
          message: 'Patch successfully applied (Dev Mode Simulation)',
        };
        setPatchResult(mock);
        addLog(`[OK] [Dev Mode] ${mock.message}`);
        setPatchLoading(false);
      }, 1000);
      return;
    }
    setPatchLoading(false);
  };

  const handleRollback = async () => {
    if (!gamePath) return;
    setRollbackLoading(true);
    addLog(isTh ? '[*] กำลังกู้คืนไฟล์ GameAssembly.dll จาก Backup Snapshot...' : '[*] Rolling back GameAssembly.dll from backup snapshot...');

    if (isTauri()) {
      try {
        const res = await tauriApi.rollbackHdiffPatch(gamePath);
        addLog(isTh ? `[OK] กู้คืนไฟล์สำเร็จ: ${res.message}` : `[OK] Rollback successful: ${res.message}`);
        setPatchResult(null);
        refreshStatus();
      } catch (e) {
        addLog(`[ERR] Error rolling back: ${e}`);
      }
    } else {
      setTimeout(() => {
        addLog('[OK] [Dev Mode] Rollback snapshot restored successfully.');
        setRollbackLoading(false);
      }, 500);
      return;
    }
    setRollbackLoading(false);
  };

  return {
    isTh,
    gamePath,
    patchFile,
    setPatchFile,
    patchLoading,
    rollbackLoading,
    patchResult,
    patchStatus,
    statusLoading,
    deployLoading,
    logs,
    handleBrowseGamePath,
    handleBrowsePatch,
    handleDeployDll,
    handleApplyPatch,
    handleRollback,
    refreshStatus,
  };
}
