import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Network, Settings } from 'lucide-react';
import { Badge, Card, Input, SectionHeader, Select, Switch } from '../ui';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';

const MCP_MODELS = [
  { value: 'claude-3.7', label: 'Claude 3.7 Sonnet (Anthropic)' },
  { value: 'gemini-2.5', label: 'Gemini 2.5 Pro (Google DeepMind)' },
  { value: 'grok-3', label: 'Grok 3 (xAI)' },
  { value: 'deepseek-r1', label: 'Local DeepSeek R1 (Ollama / llama.cpp)' },
];

const MCP_MODEL_PREF_KEY = 'hsr_owner_mcp_model';

export function ConfigView() {
  const { t, isTh } = useT();

  const ipcPort = useAppStore((state) => state.ipcPort);
  const dispatchPort = useAppStore((state) => state.dispatchPort);
  const autoAttach = useAppStore((state) => state.autoAttach);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [mcpModel, setMcpModel] = useState<string>(() => {
    try {
      return localStorage.getItem(MCP_MODEL_PREF_KEY) ?? MCP_MODELS[0].value;
    } catch {
      return MCP_MODELS[0].value;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(MCP_MODEL_PREF_KEY, mcpModel);
    } catch {
      // storage unavailable
    }
  }, [mcpModel]);

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto bg-hz-navy-900">
      <SectionHeader
        icon={<Settings className="h-5 w-5" />}
        title={isTh ? 'ตั้งค่า AI Agent & เครือข่ายระบบ' : 'AI Agent & Network Configuration'}
        badge={<Badge variant="violet">JSON-RPC & MCP</Badge>}
        description={
          isTh
            ? 'กำหนดค่า Model สำหรับ MCP Server, พอร์ต IPC (:42857) และ Dispatch Server (:21000)'
            : 'Configure LLM agent integration, JSON-RPC tools, and network binding ports.'
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* AI MCP */}
        <Card className="space-y-4 p-5 border-hz-navy-500/50 bg-hz-navy-800/80">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{t('config.ai_title')}</h2>
              <p className="text-xs text-hz-gray-400">Model Provider & Toolchain</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label htmlFor="mcp-model" className="text-hz-gray-400 block mb-1.5 font-medium">
                {t('config.active_model')}
              </label>
              <Select
                id="mcp-model"
                value={mcpModel}
                onChange={(e) => setMcpModel(e.target.value)}
                options={MCP_MODELS}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-hz-gray-400">MCP JSON-RPC Binary</span>
                <Badge variant="emerald">bin/hsr-mcp.exe</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-hz-gray-400">{t('config.tools_registered')}</span>
                <Badge variant="outline" className="font-mono">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 mr-1 inline" /> stdin / stdout
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* IPC & Endpoints */}
        <Card className="space-y-4 p-5 border-hz-navy-500/50 bg-hz-navy-800/80">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
              <Network className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{t('settings.network')}</h2>
              <p className="text-xs text-hz-gray-400">IPC & Private Server Ports</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label htmlFor="cfg-ipc-port" className="text-hz-gray-400 block mb-1.5 font-medium">
                {t('config.ipc_port')} (Hook DLL WebSocket)
              </label>
              <Input
                id="cfg-ipc-port"
                value={ipcPort}
                onChange={(e) => updateSettings({ ipcPort: e.target.value })}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="cfg-dispatch-port" className="text-hz-gray-400 block mb-1.5 font-medium">
                {t('config.dispatch_port')} (RobinSR HTTP Gateway)
              </label>
              <Input
                id="cfg-dispatch-port"
                value={dispatchPort}
                onChange={(e) => updateSettings({ dispatchPort: e.target.value })}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-hz-navy-500/40">
              <div className="pr-4">
                <div className="font-medium text-white">{t('settings.auto_attach')}</div>
                <div className="text-[10px] text-hz-gray-400">{t('settings.auto_attach.desc')}</div>
              </div>
              <Switch
                checked={autoAttach}
                onCheckedChange={(v) => updateSettings({ autoAttach: v })}
                aria-label={t('settings.auto_attach')}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
