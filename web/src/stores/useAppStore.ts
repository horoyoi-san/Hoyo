import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../lib/i18n';

export type NavigationPage =
  | 'robinsr'
  | 'patcher'
  | 'langpatcher'
  | 'rescompiler'
  | 'dumper'
  | 'morax'
  | 'sniffer'
  | 'cheat'
  | 'lua'
  | 'unpacker'
  | 'design'
  | 'config'
  | 'console'
  | 'settings';

export interface AppSettings {
  language: Language;
  gamePath: string;
  dumpPath: string;
  assetOutputDir: string;
  ipcPort: string;
  dispatchPort: string;
  gameserverPort: string;
  autoConnect: boolean;
  autoAttach: boolean;
  animationsEnabled: boolean;
  compactSidebar: boolean;
  autoScale: boolean;
}

/** Per-dumper-action job status, driven by real backend events. */
export interface DumperJob {
  status: 'idle' | 'running' | 'done' | 'failed';
  seconds?: number;
  error?: string;
}

export type DumperJobKey = 'proto.class_field_number' | 'proto.merge_from' | 'proto.write_to' | 'proto.asm' | 'c_sharp' | 'parser_data' | 'script' | 'script_v2' | 'resources';

export function dumperJobKey(action: { type: string; mode?: string }): DumperJobKey {
  return (action.mode ? `${action.type}.${action.mode}` : action.type) as DumperJobKey;
}

interface AppState extends AppSettings {
  currentPage: NavigationPage;
  desktopReady: boolean;
  gameHookConnected: boolean;
  backendConnected: boolean;
  serverRunning: boolean;
  dumperRunning: boolean;
  currentDumperAction: string | null;
  dumperJobs: Record<string, DumperJob>;
  cheatStates: Record<string, boolean>;

  setCurrentPage: (page: NavigationPage) => void;
  setDesktopReady: (ready: boolean) => void;
  setGameHookConnected: (connected: boolean) => void;
  setBackendConnected: (connected: boolean) => void;
  setServerRunning: (running: boolean) => void;
  setDumperRunning: (running: boolean, action?: string | null) => void;
  setDumperJob: (key: string, job: DumperJob) => void;
  setCheatState: (name: string, enabled: boolean) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'th',
  gamePath: '',
  dumpPath: 'DUMP',
  assetOutputDir: 'Extracted_Assets',
  ipcPort: '42857',
  dispatchPort: '21000',
  gameserverPort: '23301',
  autoConnect: true,
  autoAttach: true,
  animationsEnabled: true,
  compactSidebar: false,
  autoScale: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'robinsr',
      desktopReady: typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window),
      gameHookConnected: false,
      backendConnected: false,
      serverRunning: false,
      dumperRunning: false,
      currentDumperAction: null,
      dumperJobs: {},
      cheatStates: {},

      ...DEFAULT_SETTINGS,

      setCurrentPage: (currentPage) => set({ currentPage }),
      setDesktopReady: (desktopReady) => set({ desktopReady }),
      setGameHookConnected: (gameHookConnected) => set({ gameHookConnected, backendConnected: gameHookConnected }),
      setBackendConnected: (backendConnected) => set({ backendConnected, gameHookConnected: backendConnected }),
      setServerRunning: (serverRunning) => set({ serverRunning }),
      setDumperRunning: (dumperRunning, currentDumperAction = null) =>
        set({ dumperRunning, currentDumperAction }),
      setDumperJob: (key, job) =>
        set((state) => ({ dumperJobs: { ...state.dumperJobs, [key]: job } })),
      setCheatState: (name, enabled) =>
        set((state) => ({ cheatStates: { ...state.cheatStates, [name]: enabled } })),

      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      resetSettings: () => set((state) => ({ ...state, ...DEFAULT_SETTINGS })),
    }),
    {
      name: 'hsr_owner_settings',
      // Persist settings + last page; runtime state stays session-only.
      partialize: (state) => ({
        language: state.language,
        gamePath: state.gamePath,
        dumpPath: state.dumpPath,
        assetOutputDir: state.assetOutputDir,
        ipcPort: state.ipcPort,
        dispatchPort: state.dispatchPort,
        gameserverPort: state.gameserverPort,
        autoConnect: state.autoConnect,
        autoAttach: state.autoAttach,
        animationsEnabled: state.animationsEnabled,
        compactSidebar: state.compactSidebar,
        autoScale: state.autoScale,
        currentPage: state.currentPage,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const validPages: NavigationPage[] = [
            'robinsr', 'patcher', 'langpatcher', 'rescompiler', 'dumper',
            'morax', 'sniffer', 'cheat', 'lua', 'unpacker', 'design',
            'config', 'console', 'settings'
          ];
          if (!validPages.includes(state.currentPage)) {
            state.currentPage = 'robinsr';
          }
        }
      },
    }
  )
);
