import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ViewSkeleton } from './components/ui';
import { useAppStore, dumperJobKey } from './stores/useAppStore';
import { usePacketStore } from './stores/usePacketStore';
import { useLogStore } from './stores/useLogStore';
import { ipc } from './lib/ipc-client';
import { isTauri, tauriApi } from './lib/tauri';
import { BackendEvent, LogEntry } from './lib/types';
import autofit from 'autofit.js';

/* Route-level code splitting: each view downloads on first visit. */
const VIEWS = {
  robinsr: lazy(() => import('./components/robinsr/RobinSrView').then((m) => ({ default: m.RobinSrView }))),
  patcher: lazy(() => import('./components/patcher/PatcherDetailView').then((m) => ({ default: m.PatcherDetailView }))),
  langpatcher: lazy(() => import('./components/language/LanguagePatcherDetailView').then((m) => ({ default: m.LanguagePatcherDetailView }))),
  rescompiler: lazy(() => import('./components/rescompiler/ResCompilerView').then((m) => ({ default: m.ResCompilerView }))),
  dumper: lazy(() => import('./components/dumper/DumperView').then((m) => ({ default: m.DumperView }))),
  morax: lazy(() => import('./components/morax/MoraxView').then((m) => ({ default: m.MoraxView }))),
  sniffer: lazy(() => import('./components/sniffer/SnifferView').then((m) => ({ default: m.SnifferView }))),
  cheat: lazy(() => import('./components/cheat/CheatView').then((m) => ({ default: m.CheatView }))),
  lua: lazy(() => import('./components/lua/LuaView').then((m) => ({ default: m.LuaView }))),
  unpacker: lazy(() => import('./components/unpacker/UnpackerView').then((m) => ({ default: m.UnpackerView }))),
  design: lazy(() => import('./components/design/DesignView').then((m) => ({ default: m.DesignView }))),
  config: lazy(() => import('./components/config/ConfigView').then((m) => ({ default: m.ConfigView }))),
  console: lazy(() => import('./components/console/ConsoleView').then((m) => ({ default: m.ConsoleView }))),
  settings: lazy(() => import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView }))),
} as const;

/** Coalesce incoming packets/logs and commit to stores at most every 120ms. */
const FLUSH_MS = 120;

export default function App() {
  const currentPage = useAppStore((state) => state.currentPage);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const setBackendConnected = useAppStore((state) => state.setBackendConnected);
  const setDumperRunning = useAppStore((state) => state.setDumperRunning);
  const setDumperJob = useAppStore((state) => state.setDumperJob);
  const setCheatState = useAppStore((state) => state.setCheatState);
  const addPackets = usePacketStore((state) => state.addPackets);
  const clearPackets = usePacketStore((state) => state.clearPackets);
  const addLogs = useLogStore((state) => state.addLogs);

  const packetBuffer = useRef<Parameters<typeof addPackets>[0]>([]);
  const logBuffer = useRef<LogEntry[]>([]);
  const flushTimer = useRef<number | null>(null);

  const flush = useCallback(() => {
    flushTimer.current = null;
    if (packetBuffer.current.length > 0) {
      addPackets(packetBuffer.current);
      packetBuffer.current = [];
    }
    if (logBuffer.current.length > 0) {
      addLogs(logBuffer.current);
      logBuffer.current = [];
    }
  }, [addPackets, addLogs]);

  const enqueue = useCallback(
    (event: BackendEvent) => {
      if (event.type === 'packet') {
        packetBuffer.current.push(event.packet);
      } else if (event.type === 'log') {
        logBuffer.current.push(event.entry);
      } else if (event.type === 'dumper_started') {
        const key = dumperJobKey(event.action);
        setDumperRunning(true, key);
        setDumperJob(key, { status: 'running' });
      } else if (event.type === 'dumper_finished') {
        const key = dumperJobKey(event.action);
        setDumperRunning(false);
        setDumperJob(key, { status: 'done', seconds: event.seconds });
        logBuffer.current.push({
          timestamp_ms: Date.now(),
          level: 'info',
          target: 'dumper',
          message: `${key} finished in ${event.seconds}s`,
        });
      } else if (event.type === 'dumper_failed') {
        const key = dumperJobKey(event.action);
        setDumperRunning(false);
        setDumperJob(key, { status: 'failed', error: event.error });
        logBuffer.current.push({
          timestamp_ms: Date.now(),
          level: 'error',
          target: 'dumper',
          message: `${key} failed: ${event.error}`,
        });
      } else if (event.type === 'cheat_status') {
        setCheatState(event.name, event.enabled);
      } else if (event.type === 'sniffer_cleared') {
        clearPackets();
      } else if (event.type === 'send_packet_result') {
        logBuffer.current.push({
          timestamp_ms: Date.now(),
          level: event.ok ? 'info' : 'error',
          target: 'sniffer',
          message: event.ok ? 'Custom packet sent' : `Packet send failed: ${event.error ?? 'unknown error'}`,
        });
      }

      if (
        (packetBuffer.current.length > 0 || logBuffer.current.length > 0) &&
        flushTimer.current === null
      ) {
        flushTimer.current = window.setTimeout(flush, FLUSH_MS);
      }
    },
    [setDumperRunning, setDumperJob, setCheatState, clearPackets, flush]
  );

  const setServerRunning = useAppStore((state) => state.setServerRunning);

  const setDesktopReady = useAppStore((state) => state.setDesktopReady);
  const setGameHookConnected = useAppStore((state) => state.setGameHookConnected);

  useEffect(() => {
    // Always listen to the real game hook WebSocket (ws://127.0.0.1:42857)
    const unsubscribeStatus = ipc.onStatusChange((connected) => {
      setGameHookConnected(connected);
      setBackendConnected(connected);
    });

    if (isTauri()) {
      setDesktopReady(true);
      // Periodic check for RobinSR server running state
      const checkServer = async () => {
        try {
          const status = await tauriApi.serverStatus();
          setServerRunning(status.managedRunning || status.portListening);
        } catch {
          // ignore
        }
      };
      checkServer();
      const interval = window.setInterval(checkServer, 2000);
      return () => {
        unsubscribeStatus();
        window.clearInterval(interval);
      };
    }

    return () => unsubscribeStatus();
  }, [setDesktopReady, setGameHookConnected, setBackendConnected, setServerRunning]);

  useEffect(() => {
    const unsubscribeEvents = ipc.subscribe(enqueue);

    // Flush anything buffered when unmounting (e.g. StrictMode remount).
    return () => {
      unsubscribeEvents();
      if (flushTimer.current !== null) {
        window.clearTimeout(flushTimer.current);
      }
      flush();
    };
  }, [enqueue, flush]);

  /* Global Ctrl+K / Cmd+K command palette */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const autoScale = useAppStore((state) => state.autoScale);

  // Auto-adapt layout on window resize using autofit.js (Auto-Plugin/autofit.js)
  useEffect(() => {
    if (!autoScale) {
      autofit.off('#root');
      return;
    }

    autofit.init(
      {
        dw: 1600,
        dh: 900,
        el: '#root',
        resize: true,
        cssMode: 'zoom',
        allowScroll: true,
      },
      false
    );

    return () => {
      autofit.off('#root');
    };
  }, [autoScale]);

  const ActiveView = VIEWS[currentPage] ?? VIEWS.robinsr;

  return (
    <div className="h-full w-full flex flex-col bg-base text-ink overflow-hidden relative select-none">
      <TitleBar onOpenPalette={() => setPaletteOpen(true)} />

      <div className="flex-1 min-h-0 flex overflow-hidden relative z-10">
        <Sidebar />

        <main className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden relative scrollbar-thin" role="main">
          <ErrorBoundary area={currentPage}>
            <Suspense fallback={<ViewSkeleton />}>
              <div key={currentPage} className="w-full min-h-full flex flex-col">
                <ActiveView />
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
