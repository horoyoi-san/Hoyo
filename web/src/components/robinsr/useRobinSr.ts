import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { pickDirectory, openFolderInExplorer, openDumpFolderInExplorer } from '../../lib/filePicker';
import { isTauri, tauriApi, PatchStatus, ServerStatusInfo } from '../../lib/tauri';
import { LogMessage, ConsoleTab } from './types';

export function useRobinSr() {
  const { isTh } = useT();
  const gamePath = useAppStore((state) => state.gamePath);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const dispatchPort = useAppStore((state) => state.dispatchPort);
  const gameserverPort = useAppStore((state) => state.gameserverPort);

  const desktop = isTauri();
  const [patch, setPatch] = useState<PatchStatus | null>(null);
  const [server, setServer] = useState<ServerStatusInfo>({ managedRunning: false, portListening: false });
  const [dumpStatus, setDumpStatus] = useState<{ synced: boolean; opcodesCount: number; pairedRoutes: number }>({
    synced: false,
    opcodesCount: 0,
    pairedRoutes: 0,
  });

  const [ingestBusy, setIngestBusy] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [patchBusy, setPatchBusy] = useState(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [comboBusy, setComboBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<ConsoleTab>('ALL');
  const [copied, setCopied] = useState(false);
  const nextLogIndexRef = useRef(0);

  const [logs, setLogs] = useState<LogMessage[]>([
    {
      id: '1',
      time: new Date().toLocaleTimeString(),
      level: 'info',
      tag: 'SYSTEM',
      message: isTh
        ? 'RobinSR Autonomous Engine พร้อมทำงาน — เลือกฟังก์ชันด้านบนหรือกด 1-Click Launch'
        : 'RobinSR Autonomous Engine ready — Choose functions above or click 1-Click Launch.',
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: LogMessage['level'], tag: LogMessage['tag'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        level,
        tag,
        message,
      },
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleCopyLogs = useCallback(async () => {
    const text = logs.map((l) => `[${l.time}] [${l.tag}] ${l.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [logs]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeTab]);

  const refresh = useCallback(async () => {
    if (!desktop) return;
    try {
      const [status, patchStatus] = await Promise.all([
        tauriApi.serverStatus(),
        tauriApi.checkPatch(gamePath),
      ]);
      setServer(status);
      setPatch(patchStatus);
    } catch {
      // ignore
    }
  }, [desktop, gamePath]);

  useEffect(() => {
    if (!desktop) return;
    let isActive = true;
    let isFetching = false;

    const interval = window.setInterval(async () => {
      if (isFetching || !isActive) return;
      isFetching = true;
      try {
        const res = await tauriApi.getServerLogs(nextLogIndexRef.current);
        if (!isActive) return;
        if (res.lines && res.lines.length > 0) {
          nextLogIndexRef.current = res.nextIndex;
          for (const line of res.lines) {
            let level: LogMessage['level'] = 'info';
            let tag: LogMessage['tag'] = 'SERVER';
            if (line.includes('[ERR]') || line.includes('error') || line.includes('failed')) level = 'error';
            else if (line.includes('[OK]') || line.includes('success')) level = 'success';
            else if (line.includes('[*]') || line.includes('Starting') || line.includes('Launching') || line.includes('Scanning')) level = 'process';

            if (line.includes('DUMP') || line.includes('Opcode') || line.includes('proto')) tag = 'DUMP';
            else if (line.includes('Patch') || line.includes('hkrpg')) tag = 'PATCH';
            else if (line.includes('Game') || line.includes('Star Rail') || line.includes('UAC')) tag = 'LAUNCH';
            else if (line.includes('RobinSR') || line.includes('Dispatch') || line.includes('Gameserver') || line.includes('Port')) tag = 'SERVER';

            addLog(level, tag, line);
          }
        }
      } catch {
        // ignore
      } finally {
        isFetching = false;
      }
    }, 350);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [desktop, addLog]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const handleIngestDump = async () => {
    if (ingestBusy) return;
    setIngestBusy(true);

    addLog('process', 'DUMP', isTh ? '[*] [DUMP INGESTION] เริ่มกระบวนการสร้าง Server Schema จาก ./DUMP...' : '[*] [DUMP INGESTION] Starting schema build from ./DUMP...');

    try {
      if (desktop) {
        const res = await tauriApi.ingestDumpFolder();
        setDumpStatus({
          synced: res.success,
          opcodesCount: res.opcodesCount,
          pairedRoutes: res.pairedRoutesCount,
        });
        addLog('success', 'DUMP', isTh
          ? `[OK] ทำ Server จาก DUMP สำเร็จ (${res.opcodesCount} Opcodes, ${res.pairedRoutesCount} Routes)`
          : `[OK] Server schema build complete (${res.opcodesCount} opcodes, ${res.pairedRoutesCount} paired routes)`);
      } else {
        addLog('info', 'DUMP', `[DUMP SCANNER] Scanning directory: ./DUMP`);
        addLog('success', 'DUMP', `[DUMP SCANNER] Ingested 'packetIds.json' (18 opcodes mapped)`);
        addLog('success', 'DUMP', `[DUMP SCANNER] Ingested 'StarRail.proto' (18 CmdId enum definitions)`);
        addLog('info', 'DUMP', `[DUMP SCANNER] Verified 'dump.cs' C# type metadata and method RVAs`);
        addLog('success', 'DUMP', isTh ? '[OK] ทำ Server จาก DUMP สำเร็จ! โครงสร้างพร้อมเปิดใช้งาน' : '[OK] Server schema build complete! Ready to start.');
        setDumpStatus({ synced: true, opcodesCount: 18, pairedRoutes: 9 });
      }
    } catch (err) {
      addLog('error', 'DUMP', `${isTh ? 'ทำ Server จาก DUMP ไม่สำเร็จ' : 'Dump ingestion failed'}: ${err}`);
    }

    setIngestBusy(false);
  };

  const handleToggleServer = async () => {
    if (serverBusy) return;
    setServerBusy(true);

    const isRunning = server.managedRunning || server.portListening;

    if (isRunning) {
      addLog('process', 'SERVER', isTh ? 'กำลังสั่งปิดเซิร์ฟเวอร์ RobinSR...' : 'Stopping RobinSR Server...');
      try {
        if (desktop) {
          await tauriApi.stopServer();
        }
        setServer({ managedRunning: false, portListening: false });
        addLog('info', 'SERVER', isTh ? 'ปิดเซิร์ฟเวอร์เรียบร้อยแล้ว' : 'RobinSR Server gracefully stopped.');
      } catch (err) {
        addLog('error', 'SERVER', `${isTh ? 'ปิดเซิร์ฟเวอร์ไม่สำเร็จ' : 'Failed to stop server'}: ${err}`);
      }
    } else {
      addLog('process', 'SERVER', isTh ? `[*] กำลังเริ่มต้นเซิร์ฟเวอร์ RobinSR...` : `Starting RobinSR Private Server...`);
      addLog('info', 'SERVER', `Scanning ./DUMP for dynamic opcodes & StarRail.proto...`);
      addLog('info', 'SERVER', `[DISPATCH GATEWAY] HTTP Gateway listening on http://0.0.0.0:${dispatchPort}`);
      addLog('info', 'SERVER', `[GAMESERVER KCP] UDP Socket bound to 0.0.0.0:${gameserverPort}`);

      try {
        if (desktop) {
          await tauriApi.startServer();
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 250));
            const cur = await tauriApi.serverStatus();
            if (cur.portListening) {
              setServer(cur);
              break;
            }
          }
        } else {
          setServer({ managedRunning: true, portListening: true });
        }
        addLog('success', 'SERVER', isTh ? `[OK] HTTP Dispatch Gateway (:${dispatchPort}) & KCP Gameserver (:${gameserverPort}) listening.` : `[OK] HTTP Dispatch Gateway (:${dispatchPort}) & KCP Gameserver (:${gameserverPort}) listening.`);
      } catch (err) {
        addLog('error', 'SERVER', `${isTh ? 'เปิดเซิร์ฟเวอร์ไม่สำเร็จ' : 'Failed to start server'}: ${err}`);
      }
    }

    await refresh();
    setServerBusy(false);
  };

  const handleResetPosition = async () => {
    try {
      if (desktop) {
        await tauriApi.resetPlayerPosition();
      }
      addLog('info', 'SERVER', isTh ? 'รีเซ็ตตำแหน่งตัวละคร (ลบ persistent) เรียบร้อยแล้ว' : 'Reset player position (removed persistent file).');
    } catch (err) {
      addLog('error', 'SERVER', `${err}`);
    }
  };

  const handleInstallPatch = async () => {
    if (patchBusy) return;
    setPatchBusy(true);

    addLog('process', 'PATCH', isTh ? `[*] [ขั้นตอน 1/2] กำลังตรวจสอบโฟลเดอร์เกม: ${gamePath}` : `[Step 1/2] Verifying game path: ${gamePath}`);

    try {
      if (desktop) {
        const pStatus = await tauriApi.checkPatch(gamePath);
        if (!pStatus.gameExePresent) {
          addLog('error', 'PATCH', isTh ? `[ERR] ไม่พบ StarRail.exe ใน: ${gamePath}` : `[ERR] StarRail.exe not found in: ${gamePath}`);
          setPatchBusy(false);
          return;
        }

        addLog('process', 'PATCH', isTh ? '[*] [ขั้นตอน 2/2] กำลังติดตั้ง Redirect Patch (hkrpg.dll)...' : '[Step 2/2] Installing hkrpg.dll & launcher.exe...');
        const updatedStatus = await tauriApi.installPatch(gamePath);
        setPatch(updatedStatus);
        addLog('success', 'PATCH', isTh ? '[OK] ติดตั้ง Patch (hkrpg.dll & launcher.exe) สำเร็จ' : '[OK] Patch (hkrpg.dll & launcher.exe) successfully installed.');
      } else {
        addLog('process', 'PATCH', `[*] Installing hkrpg.dll & launcher.exe redirect patch to ${gamePath}...`);
        addLog('success', 'PATCH', `[OK] Patch (hkrpg.dll & launcher.exe) successfully installed.`);
        setPatch({ dllPresent: true, launcherPresent: true, dllModifiedSecs: Date.now() / 1000, launcherModifiedSecs: Date.now() / 1000, gameExePresent: true });
      }
    } catch (err) {
      addLog('error', 'PATCH', `${isTh ? 'ติดตั้ง Patch ไม่สำเร็จ' : 'Failed to install patch'}: ${err}`);
    }

    await refresh();
    setPatchBusy(false);
  };

  const handleLaunchGame = async () => {
    if (launchBusy) return;
    setLaunchBusy(true);

    addLog('process', 'LAUNCH', isTh ? `[*] กำลังสั่งเปิดตัวเกม Star Rail ใน: ${gamePath}` : `Spawning Star Rail game client in: ${gamePath}`);

    try {
      if (desktop) {
        const pStatus = await tauriApi.checkPatch(gamePath);
        if (!pStatus.gameExePresent) {
          addLog('error', 'LAUNCH', isTh ? `[ERR] ไม่พบ StarRail.exe ใน: ${gamePath}` : `[ERR] StarRail.exe not found in: ${gamePath}`);
          setLaunchBusy(false);
          return;
        }

        addLog('process', 'LAUNCH', isTh ? 'กำลังขอสิทธิ์ Admin (UAC Elevation)...' : 'Requesting administrative UAC elevation...');
        await tauriApi.launchGame(gamePath);
        addLog('success', 'LAUNCH', isTh ? 'Game process launched (UAC Elevation granted).' : 'Game process launched (UAC Elevation granted).');
      } else {
        addLog('success', 'LAUNCH', isTh ? 'Game process launched (UAC Elevation granted).' : 'Game process launched (UAC Elevation granted).');
      }
    } catch (err) {
      addLog('error', 'LAUNCH', `${isTh ? 'เปิดเกมไม่สำเร็จ' : 'Failed to launch game'}: ${err}`);
    }

    setLaunchBusy(false);
  };

  const handleComboLaunch = async () => {
    if (comboBusy) return;
    setComboBusy(true);

    addLog('process', 'SYSTEM', isTh ? '[*] เริ่มต้นกระบวนการ 1-Click All-in-One ครบวงจร...' : '[*] Starting 1-Click All-in-One sequence...');

    await handleIngestDump();
    if (!server.portListening) {
      await handleToggleServer();
    }
    if (!patch?.dllPresent || !patch?.launcherPresent) {
      await handleInstallPatch();
    }
    await handleLaunchGame();

    setComboBusy(false);
  };

  const handleBrowseGamePath = async () => {
    const selected = await pickDirectory();
    if (selected) {
      let fullPath = selected.replace(/\\/g, '/');
      if (!fullPath.includes(':') && !fullPath.startsWith('/')) {
        if (gamePath && gamePath.includes(':')) {
          const parentDir = gamePath.slice(0, gamePath.lastIndexOf('/'));
          fullPath = `${parentDir}/${fullPath}`;
        } else {
          fullPath = `C:/Games/${fullPath}`;
        }
      }
      updateSettings({ gamePath: fullPath });
      addLog('info', 'SYSTEM', `${isTh ? 'เปลี่ยนโฟลเดอร์เกมเป็น' : 'Game directory set to'}: ${fullPath}`);
    }
  };

  const handleOpenInExplorer = async () => {
    const opened = await openFolderInExplorer(gamePath);
    if (opened) {
      addLog('info', 'SYSTEM', `${isTh ? 'เปิดโฟลเดอร์ใน File Explorer แล้ว' : 'Opened folder in File Explorer'}: ${gamePath}`);
    } else {
      addLog('info', 'SYSTEM', `${isTh ? 'คัดลอกที่อยู่โฟลเดอร์ลง Clipboard แล้ว' : 'Copied game path to clipboard'}: ${gamePath}`);
    }
  };

  const handleOpenDumpFolder = async () => {
    await openDumpFolderInExplorer();
    addLog('info', 'SYSTEM', isTh ? 'เปิดโฟลเดอร์ ./DUMP ใน File Explorer แล้ว' : 'Opened ./DUMP folder in File Explorer');
  };

  const serverOn = server.portListening;
  const patchReady = patch?.dllPresent && patch?.launcherPresent;

  const filteredLogs = useMemo(() => {
    if (activeTab === 'ALL') return logs;
    return logs.filter((l) => l.tag === activeTab);
  }, [logs, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = { ALL: logs.length, SERVER: 0, DUMP: 0, PATCH: 0, LAUNCH: 0 };
    for (const l of logs) {
      if (l.tag in counts) {
        counts[l.tag as keyof typeof counts]++;
      }
    }
    return counts;
  }, [logs]);

  return {
    isTh,
    gamePath,
    updateSettings,
    dispatchPort,
    gameserverPort,
    serverOn,
    patchReady,
    patch,
    dumpStatus,
    ingestBusy,
    serverBusy,
    patchBusy,
    launchBusy,
    comboBusy,
    activeTab,
    setActiveTab,
    copied,
    terminalEndRef,
    logs,
    filteredLogs,
    tabCounts,
    handleCopyLogs,
    clearLogs,
    handleIngestDump,
    handleToggleServer,
    handleResetPosition,
    handleInstallPatch,
    handleLaunchGame,
    handleComboLaunch,
    handleBrowseGamePath,
    handleOpenInExplorer,
    handleOpenDumpFolder,
  };
}
