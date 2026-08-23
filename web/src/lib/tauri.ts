/**
 * Bridge to the Tauri desktop shell (src-tauri/src/main.rs).
 * In a plain browser there is no shell — call sites must check isTauri()
 * and fall back to manual instructions.
 */

interface TauriInternals {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

function internals(): TauriInternals | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w.__TAURI_INTERNALS__?.invoke) return w.__TAURI_INTERNALS__;
  if (w.__TAURI__?.core?.invoke) return w.__TAURI__.core;
  if (w.__TAURI__?.invoke) return w.__TAURI__;
  return null;
}

export function isTauri(): boolean {
  return internals() !== null;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const api = internals();
  if (!api) throw new Error('desktop-only');
  return api.invoke<T>(cmd, args);
}

export interface PatchStatus {
  dllPresent: boolean;
  launcherPresent: boolean;
  dllModifiedSecs: number;
  launcherModifiedSecs: number;
  gameExePresent: boolean;
}

export interface ServerStatusInfo {
  managedRunning: boolean;
  portListening: boolean;
}

export interface MoraxDumpResult {
  success: boolean;
  typesCount: number;
  methodsCount: number;
  fieldsCount: number;
  timeSeconds: number;
  outputDir: string;
  files: string[];
  message: string;
}

export const PATCH_REPO_URL = 'https://git.neonteam.dev/amizing/hkrpg-patch';

export interface LogsResult {
  nextIndex: number;
  lines: string[];
}

export interface DumpIngestResult {
  success: boolean;
  dumpPath: string;
  opcodesCount: number;
  pairedRoutesCount: number;
  protoFound: boolean;
  jsonFound: boolean;
  dumpCsFound: boolean;
  dummyDllFound: boolean;
  message: string;
}

export interface ResCompileResult {
  success: boolean;
  sceneGroupsCount: number;
  avatarsCount: number;
  mapEntrancesCount: number;
  timeSeconds: number;
  outputFile: string;
  fileSizeMb: number;
  message: string;
}

export interface HDiffResult {
  success: boolean;
  filesPatched: number;
  totalBytesProcessed: number;
  timeSeconds: number;
  message: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

export interface GameLanguageState {
  currentTextLang: string;
  currentAudioLang: string;
  supportedTextLanguages: LanguageInfo[];
  supportedAudioLanguages: LanguageInfo[];
  gameDirValid: boolean;
}

export interface LanguagePatchResult {
  success: boolean;
  previousText: string;
  newText: string;
  previousAudio: string;
  newAudio: string;
  message: string;
}

export const tauriApi = {
  checkPatch: (gamePath: string) =>
    invoke<PatchStatus>('check_patch', { gamePath }),

  installPatch: (gamePath: string) =>
    invoke<PatchStatus>('install_patch', { gamePath }),

  launchGame: (gamePath: string) => invoke<void>('launch_game', { gamePath }),

  ingestDumpFolder: () => invoke<DumpIngestResult>('ingest_dump_folder'),

  startServer: () => invoke<number>('start_server'),

  stopServer: () => invoke<void>('stop_server'),

  serverStatus: () => invoke<ServerStatusInfo>('server_status'),

  getServerLogs: (fromIndex: number) => invoke<LogsResult>('get_server_logs', { fromIndex }),

  openInExplorer: (path: string) => invoke<void>('open_in_explorer', { path }),

  openDumpFolder: () => invoke<void>('open_dump_folder'),

  pickDirectoryDialog: () => invoke<string | null>('pick_directory_dialog'),

  pickFileDialog: (filterExt?: string) => invoke<string | null>('pick_file_dialog', { filterExt }),

  resetPlayerPosition: () => invoke<string>('reset_player_position'),

  executeMoraxDump: (metadataPath: string, assemblyPath: string, outputDir: string) =>
    invoke<MoraxDumpResult>('execute_morax_metadata_dump', { metadataPath, assemblyPath, outputDir }),

  executeMoraxMetadataDump: (metadataPath: string, assemblyPath: string, outputDir: string) =>
    invoke<MoraxDumpResult>('execute_morax_metadata_dump', { metadataPath, assemblyPath, outputDir }),

  executeBetaProtoDump: (
    gameDir: string,
    methodsJson: string,
    dumpCs: string,
    assemblyPath: string,
    outputDir: string
  ) =>
    invoke<MoraxDumpResult>('execute_beta_proto_dump', {
      gameDir,
      methodsJson,
      dumpCs,
      assemblyPath,
      outputDir,
    }),

  executeDummyDllsDump: (outputDir: string) =>
    invoke<MoraxDumpResult>('execute_dummy_dlls_dump', { outputDir }),

  executeMoraxAllInOne: (
    gameDir: string,
    methodsJson: string,
    dumpCs: string,
    assemblyPath: string,
    metadataPath: string,
    outputDir: string
  ) =>
    invoke<MoraxDumpResult>('execute_morax_all_in_one', {
      gameDir,
      methodsJson,
      dumpCs,
      assemblyPath,
      metadataPath,
      outputDir,
    }),

  executeGenerateResJson: (resourcesPath: string, outputPath: string) =>
    invoke<ResCompileResult>('execute_generate_res_json', { resourcesPath, outputPath }),

  executeApplyPatch: (gameDir: string, patchArchive: string) =>
    invoke<HDiffResult>('execute_apply_patch', { gameDir, patchArchive }),

  getGameLanguages: (gameDir: string) =>
    invoke<GameLanguageState>('get_game_languages', { gameDir }),

  setGameLanguage: (gameDir: string, textLang: string, audioLang: string) =>
    invoke<LanguagePatchResult>('set_game_language', { gameDir, textLang, audioLang }),
};

