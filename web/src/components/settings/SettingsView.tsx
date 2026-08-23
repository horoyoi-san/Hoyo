import { CheckCircle2, Cpu, FolderOpen, FolderDown, Languages, Network, RotateCcw, Settings } from 'lucide-react';
import { Badge, Button, Card, Input, SectionHeader, Switch } from '../ui';
import { useAppStore } from '../../stores/useAppStore';
import { pickDirectory, openFolderInExplorer, openDumpFolderInExplorer } from '../../lib/filePicker';
import { useT } from '../../lib/hooks';
import { cn } from '../../lib/utils';

export function SettingsView() {
  const { t } = useT();

  // Atomic selectors — this view re-renders only for the fields it shows.
  const language = useAppStore((state) => state.language);
  const gamePath = useAppStore((state) => state.gamePath);
  const ipcPort = useAppStore((state) => state.ipcPort);
  const dispatchPort = useAppStore((state) => state.dispatchPort);
  const gameserverPort = useAppStore((state) => state.gameserverPort);
  const autoConnect = useAppStore((state) => state.autoConnect);
  const autoAttach = useAppStore((state) => state.autoAttach);
  const animationsEnabled = useAppStore((state) => state.animationsEnabled);
  const compactSidebar = useAppStore((state) => state.compactSidebar);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const resetSettings = useAppStore((state) => state.resetSettings);

  /* All edits write straight to the persisted store — no fake Save button. */

  const browseGamePath = async () => {
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
    }
  };

  const openGameInExplorer = () => openFolderInExplorer(gamePath);
  const openDumpInExplorer = () => openDumpFolderInExplorer();

  const languageCard = (code: 'th' | 'en', label: string, desc: string) => (
    <button
      type="button"
      onClick={() => updateSettings({ language: code })}
      aria-pressed={language === code}
      className={cn(
        'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        language === code
          ? 'bg-accent/20 border-accent/50 text-white shadow-sm'
          : 'bg-surface-1 border-hairline text-ink-2 hover:text-ink hover:border-edge-strong'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{label}</span>
        {language === code && (
          <Badge variant="violet" className="text-[10px]">
            <CheckCircle2 className="h-2.5 w-2.5" /> ON
          </Badge>
        )}
      </div>
      <span className="text-[11px] text-ink-4 mt-2">{desc}</span>
    </button>
  );

  const toggleRow = (title: string, desc: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between pt-3">
      <div className="pr-4">
        <div className="text-xs font-medium text-ink-2">{title}</div>
        <div className="text-[11px] text-ink-4">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto">
      <SectionHeader
        icon={<Settings className="h-5 w-5" />}
        title={t('settings.title')}
        badge={<Badge variant="emerald">{t('settings.autosave')}</Badge>}
        description={t('settings.desc')}
        actions={
          <Button variant="outline" size="sm" onClick={resetSettings}>
            <RotateCcw className="h-3.5 w-3.5" /> {t('settings.reset_defaults')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Language */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-ink-2">
            <Languages className="h-4 w-4 text-accent-soft" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider">{t('settings.language')}</h2>
          </div>
          <p className="text-xs text-ink-3">{t('settings.language.desc')}</p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {languageCard('th', 'ภาษาไทย (TH)', 'คำอธิบายและเมนูภาษาไทยเข้าใจง่าย')}
            {languageCard('en', 'English (EN)', 'Standard technical interface labels')}
          </div>
        </Card>

        {/* Paths */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-ink-2">
            <FolderOpen className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider">{t('settings.paths')}</h2>
          </div>
          <p className="text-xs text-ink-3">{t('settings.paths.desc')}</p>

          <div className="space-y-3">
            <div>
              <label htmlFor="game-path" className="text-[11px] text-ink-3 block mb-1">
                {t('settings.game_path')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="game-path"
                  value={gamePath}
                  onChange={(e) => updateSettings({ gamePath: e.target.value })}
                  className="font-mono text-xs flex-1"
                />
                <Button variant="secondary" size="sm" onClick={browseGamePath} icon={<FolderOpen className="h-3.5 w-3.5" />}>
                  {t('btn.browse')}
                </Button>
                <Button variant="outline" size="sm" onClick={openGameInExplorer} icon={<FolderDown className="h-3.5 w-3.5" />}>
                  {t('btn.open_explorer')}
                </Button>
              </div>
            </div>

            <div>
              <label htmlFor="dump-path" className="text-[11px] text-ink-3 block mb-1">
                {t('settings.dump_path')}
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 px-3 py-2 rounded-lg bg-surface-1 border border-hairline font-mono text-xs text-emerald-400 flex items-center gap-2">
                  <span>📁</span>
                  <span className="font-bold">./DUMP/</span>
                  <span className="text-[11px] text-ink-4">({t('dumper.target_dir')})</span>
                </div>
                <Button variant="outline" size="sm" onClick={openDumpInExplorer} icon={<FolderDown className="h-3.5 w-3.5" />}>
                  {t('btn.open_explorer')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Network */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-ink-2">
            <Network className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider">{t('settings.network')}</h2>
          </div>
          <p className="text-xs text-ink-3">{t('settings.network.desc')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ipc-port" className="text-[11px] text-ink-3 block mb-1">
                IPC Port (WS)
              </label>
              <Input
                id="ipc-port"
                value={ipcPort}
                onChange={(e) => updateSettings({ ipcPort: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label htmlFor="dispatch-port" className="text-[11px] text-ink-3 block mb-1">
                Dispatch (HTTP)
              </label>
              <Input
                id="dispatch-port"
                value={dispatchPort}
                onChange={(e) => updateSettings({ dispatchPort: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label htmlFor="gameserver-port" className="text-[11px] text-ink-3 block mb-1">
                Gameserver (KCP)
              </label>
              <Input
                id="gameserver-port"
                value={gameserverPort}
                onChange={(e) => updateSettings({ gameserverPort: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Behavior */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-ink-2">
            <Cpu className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider">{t('settings.behavior')}</h2>
          </div>

          <div className="divide-y divide-hairline">
            {toggleRow(t('settings.auto_attach'), t('settings.auto_attach.desc'), autoAttach, (v) =>
              updateSettings({ autoAttach: v })
            )}
            {toggleRow(t('settings.auto_connect'), t('settings.auto_connect.desc'), autoConnect, (v) =>
              updateSettings({ autoConnect: v })
            )}
            {toggleRow(t('settings.animations'), t('settings.animations.desc'), animationsEnabled, (v) =>
              updateSettings({ animationsEnabled: v })
            )}
            {toggleRow(t('settings.compact'), t('settings.compact.desc'), compactSidebar, (v) =>
              updateSettings({ compactSidebar: v })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
