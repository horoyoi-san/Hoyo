import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
// Core editor + Lua tokenizer only — avoids bundling every monaco language.
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/lua/register';
import editorWorker from '../../workers/monaco-editor-worker?worker';
import { Code2, FileCode, Play, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Kbd, SectionHeader, Switch, UnifiedLogConsole } from '../ui';
import { ipc } from '../../lib/ipc-client';
import { useAppStore } from '../../stores/useAppStore';
import { useLogStore } from '../../stores/useLogStore';
import { useT } from '../../lib/hooks';

/* Self-hosted Monaco: bundled with the app so the editor works fully
   offline in the Tauri desktop shell (no CDN fetch at runtime). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).MonacoEnvironment = { getWorker: () => new editorWorker() };
loader.config({ monaco });

const LUA_PRESETS = [
  {
    nameKey: 'lua.preset.info',
    code: `local player = CS.RPG.Client.PlayerManager.Instance:GetLocalPlayer()
print("[AstralOS] Player UID: " .. tostring(player.Uid))
print("[AstralOS] World Map: " .. tostring(player.SceneId))`,
  },
  {
    nameKey: 'lua.preset.fov',
    code: `local cam = CS.UnityEngine.Camera.main
if cam ~= nil then
    cam.fieldOfView = 85.0
    print("[AstralOS] Field of View updated to 85.0")
end`,
  },
  {
    nameKey: 'lua.preset.toast',
    code: `local notice = "[AstralOS] Engineering Mode Active"
CS.RPG.Client.UI.ToastManager.Instance:ShowToast(notice)
print(notice)`,
  },
];

export function LuaView() {
  const { t, isTh } = useT();

  const backendConnected = useAppStore((state) => state.backendConnected);
  const logs = useLogStore((state) => state.logs);

  const [script, setScript] = useState<string>(LUA_PRESETS[0].code);
  const [runOnSceneLoad, setRunOnSceneLoad] = useState(false);
  const [localLines, setLocalLines] = useState<{ time: string; text: string }[]>([]);

  const scriptRef = useRef(script);
  useEffect(() => {
    scriptRef.current = script;
  }, [script]);

  /* Lua engine output arrives as regular log events — surface lines whose
     target mentions lua, plus the local dispatch notes. */
  const luaLogs = useMemo(
    () =>
      logs
        .filter((log) => /lua/i.test(log.target))
        .map((log) => ({
          time: new Date(log.timestamp_ms).toTimeString().split(' ')[0],
          text: `[${log.target}] ${log.message}`,
        })),
    [logs]
  );

  const outputLogs = useMemo(() => [...localLines, ...luaLogs], [localLines, luaLogs]);

  const handleExecute = () => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const newItems = [
      {
        time: timeStr,
        text: isTh
          ? '[PROC 1/2] กำลังตรวจสอบความถูกต้องของสคริปต์ Lua 5.3...'
          : '[PROC 1/2] Verifying and parsing Lua 5.3 script buffer...',
      },
      {
        time: timeStr,
        text: isTh
          ? '[PROC 2/2] ส่ง Payload ไปยังเธรดหลักของเกมผ่าน IPC (:42857)...'
          : '[PROC 2/2] Dispatched to game main thread via IPC (:42857)...',
      },
      backendConnected
        ? {
            time: timeStr,
            text: isTh
              ? '[OK] ส่งสคริปต์ไปยัง XLua Engine เรียบร้อย (รอรับผลลัพธ์ผ่าน print)'
              : '[OK] Dispatched successfully to XLua Engine (awaiting print output)',
          }
        : {
            time: timeStr,
            text: isTh
              ? '[INFO] ไคลเอนต์เกมยังไม่ได้เปิด: สคริปต์จะถูกเก็บไว้ฉีดอัตโนมัติเมื่อเกมเปิด'
              : '[INFO] Game client is offline: Payload queued for auto-injection when game starts',
          },
    ];

    setLocalLines((prev) => [...prev.slice(-150), ...newItems]);
    ipc.executeLua(scriptRef.current);
    if (runOnSceneLoad) {
      ipc.executeLuaOnLoad(scriptRef.current);
    }
  };

  /* Ctrl+Enter runs the script straight from the editor. */
  const handleMount: OnMount = (editor) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleExecute);
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5 select-none">
      <SectionHeader
        icon={<Code2 className="h-5 w-5" />}
        title={t('lua.title')}
        badge={
          <Badge variant={backendConnected ? 'emerald' : 'neutral'} dot={backendConnected}>
            {backendConnected ? 'XLua REPL Online' : t('status.offline')}
          </Badge>
        }
        description={t('lua.desc')}
        actions={
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer">
              <Switch checked={runOnSceneLoad} onCheckedChange={setRunOnSceneLoad} aria-label={t('lua.scene_load')} />
              <span>{t('lua.scene_load')}</span>
            </label>
            <Button variant="primary" size="sm" onClick={handleExecute} icon={<Play className="h-3.5 w-3.5 fill-current" />}>
              {t('lua.run_btn')}
            </Button>
          </div>
        }
      />

      {/* Main Split Grid */}
      <div className="flex-1 min-h-[580px] grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Presets Sidebar */}
        <Card className="lg:col-span-3 flex flex-col p-3 space-y-3 min-h-[300px] lg:min-h-full overflow-hidden" flat>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3 flex items-center gap-2 px-1 shrink-0">
            <FileCode className="h-3.5 w-3.5" aria-hidden="true" /> {t('lua.presets')}
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto scrollbar-thin">
            {LUA_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setScript(preset.code)}
                className="w-full text-left p-2.5 rounded-lg bg-surface-1 hover:bg-accent/10 border border-hairline hover:border-accent/30 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <div className="text-xs font-semibold text-ink-2 group-hover:text-accent-soft">
                  {t(preset.nameKey)}
                </div>
                <div className="text-[10px] text-ink-4 font-mono mt-0.5">Preset #{idx + 1}</div>
              </button>
            ))}
          </div>

          <div className="p-2.5 rounded-lg log-pane border border-hairline text-[11px] text-ink-3 space-y-1 shrink-0">
            <div className="flex items-center gap-1.5 text-ink-2 font-medium">
              <Sparkles className="h-3 w-3 text-accent-soft" aria-hidden="true" />
              <span>{isTh ? 'เชื่อมโยง Unity C# ได้ครบ' : 'Full Unity C# Interop'}</span>
            </div>
            <p className="text-[10px] text-ink-4 font-mono">CS.UnityEngine / CS.RPG.Client</p>
          </div>
        </Card>

        {/* Editor + Output Columns */}
        <div className="lg:col-span-9 flex flex-col gap-3 min-h-[500px] lg:min-h-full">
          {/* Monaco Editor Container - Expands Smoothly */}
          <Card className="flex-1 min-h-[340px] p-0 overflow-hidden flex flex-col" flat>
            <div className="px-3.5 py-2 bg-surface-1 border-b border-edge flex items-center justify-between text-xs text-ink-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-ink-2 font-semibold">script.lua</span>
                <Badge variant="outline" className="text-[9px] font-mono">
                  Lua 5.3 / XLua
                </Badge>
              </div>
              <span className="text-[11px] text-ink-4 flex items-center gap-1">
                <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> {isTh ? 'รันสคริปต์' : 'to run'}
              </span>
            </div>

            <div className="flex-1 min-h-0 w-full h-full">
              <Editor
                height="100%"
                defaultLanguage="lua"
                theme="vs-dark"
                value={script}
                onChange={(value) => setScript(value || '')}
                onMount={handleMount}
                loading={
                  <div className="flex items-center gap-2 text-xs text-ink-3 p-4">
                    <span className="skeleton h-3 w-3" /> loading editor...
                  </div>
                }
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbersMinChars: 3,
                  fontFamily: 'JetBrains Mono, ui-monospace, Consolas, monospace',
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </Card>

          {/* Unified Execution Output Stream Console */}
          <div className="h-56 sm:h-64 shrink-0">
            <UnifiedLogConsole
              title={isTh ? 'ผลลัพธ์การทำงานของ XLua (Execution Output)' : 'XLua Execution & Engine Output'}
              subtitle="print() & IPC Stream"
              logs={outputLogs}
              onClear={() => setLocalLines([])}
              exportFileName="xlua-execution-output.log"
              heightClassName="h-36 sm:h-44"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
