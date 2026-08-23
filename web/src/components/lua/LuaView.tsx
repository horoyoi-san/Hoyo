import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
// Core editor + Lua tokenizer only — avoids bundling every monaco language.
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/lua/register';
import editorWorker from '../../workers/monaco-editor-worker?worker';
import { Code2, FileCode, Play, Sparkles, Terminal } from 'lucide-react';
import { Badge, Button, Card, Kbd, SectionHeader, Switch } from '../ui';
import { ipc } from '../../lib/ipc-client';
import { useAppStore } from '../../stores/useAppStore';
import { useLogStore } from '../../stores/useLogStore';
import { useT } from '../../lib/hooks';
import { formatTime } from '../../lib/utils';

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
  const [localLines, setLocalLines] = useState<{ time: number; text: string }[]>([]);

  const outputRef = useRef<HTMLDivElement>(null);
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
        .map((log) => ({ time: log.timestamp_ms, text: `[${log.target}] ${log.message}` })),
    [logs]
  );

  const outputLines = useMemo(() => [...localLines, ...luaLogs], [localLines, luaLogs]);

  const handleExecute = () => {
    setLocalLines((prev) => [
      ...prev.slice(-50),
      { time: Date.now(), text: isTh ? '→ ส่งสคริปต์ไปยังเธรดหลักของเกมแล้ว' : '→ dispatched to game main thread' },
    ]);
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
    <div className="h-full flex flex-col gap-4 p-6 overflow-hidden">
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

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Presets */}
        <Card className="lg:col-span-3 flex flex-col p-3 space-y-3" flat>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3 flex items-center gap-2 px-1">
            <FileCode className="h-3.5 w-3.5" aria-hidden="true" /> {t('lua.presets')}
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto">
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

          <div className="p-2.5 rounded-lg log-pane border border-hairline text-[11px] text-ink-3 space-y-1">
            <div className="flex items-center gap-1.5 text-ink-2 font-medium">
              <Sparkles className="h-3 w-3 text-accent-soft" aria-hidden="true" />
              <span>{isTh ? 'เชื่อมโยง Unity C# ได้ครบ' : 'Full Unity C# Interop'}</span>
            </div>
            <p className="text-[10px] text-ink-4">CS.UnityEngine / CS.RPG.Client</p>
          </div>
        </Card>

        {/* Editor + output */}
        <div className="lg:col-span-9 flex flex-col gap-3 min-h-0">
          <Card className="flex-1 min-h-0 p-0 overflow-hidden flex flex-col" flat>
            <div className="px-3 py-2 bg-surface-1 border-b border-edge flex items-center justify-between text-xs text-ink-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-ink-2">script.lua</span>
                <Badge variant="outline" className="text-[9px] font-mono">
                  Lua 5.3 / XLua
                </Badge>
              </div>
              <span className="text-[11px] text-ink-4 flex items-center gap-1">
                <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> {isTh ? 'รัน' : 'to run'}
              </span>
            </div>

            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="lua"
                theme="vs-dark"
                value={script}
                onChange={(value) => setScript(value || '')}
                onMount={handleMount}
                loading={
                  <div className="flex items-center gap-2 text-xs text-ink-3">
                    <span className="skeleton h-3 w-3" /> loading editor...
                  </div>
                }
                options={{
                  fontSize: 12,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbersMinChars: 3,
                  fontFamily: 'JetBrains Mono, ui-monospace, Consolas, monospace',
                  padding: { top: 10, bottom: 10 },
                }}
              />
            </div>
          </Card>

          {/* Output console */}
          <Card className="h-28 flex flex-col p-3 log-pane text-[11px] overflow-hidden" flat>
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-hairline text-ink-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                <span className="text-ink-2 font-semibold">
                  {isTh ? 'ผลลัพธ์การทำงาน (Output)' : 'Execution Output'}
                </span>
              </div>
            </div>

            <div ref={outputRef} className="flex-1 overflow-y-auto space-y-1 text-ink-2 selectable">
              {outputLines.length === 0 ? (
                <span className="text-ink-4">
                  {isTh
                    ? 'รอผลลัพธ์ — print() จากสคริปต์จะปรากฏที่นี่'
                    : 'Awaiting output — print() output from the game appears here.'}
                </span>
              ) : (
                outputLines.map((line, i) => (
                  <div key={i} className="break-all">
                    <span className="text-ink-4">{formatTime(line.time)} </span>
                    {line.text}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
