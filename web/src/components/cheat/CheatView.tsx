import {
  EyeOff,
  Gauge,
  Keyboard,
  Maximize2,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Badge, Card, Kbd, SectionHeader, Switch } from '../ui';
import { ipc } from '../../lib/ipc-client';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { cn } from '../../lib/utils';

interface CheatFeature {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ElementType;
  hotkey?: string;
  defaultEnabled: boolean;
}

const FEATURES: CheatFeature[] = [
  {
    id: 'dither_patch',
    nameKey: 'cheat.feat.dither',
    descKey: 'cheat.feat.dither.desc',
    icon: Sparkles,
    hotkey: 'F1',
    defaultEnabled: true,
  },
  {
    id: 'hide_ui',
    nameKey: 'cheat.feat.hideui',
    descKey: 'cheat.feat.hideui.desc',
    icon: EyeOff,
    hotkey: 'F2',
    defaultEnabled: false,
  },
  {
    id: 'fov_unlock',
    nameKey: 'cheat.feat.fov',
    descKey: 'cheat.feat.fov.desc',
    icon: Maximize2,
    hotkey: 'F3',
    defaultEnabled: true,
  },
  {
    id: 'fps_unlock',
    nameKey: 'cheat.feat.fps',
    descKey: 'cheat.feat.fps.desc',
    icon: Gauge,
    hotkey: 'F4',
    defaultEnabled: true,
  },
  {
    id: 'battle_speed',
    nameKey: 'cheat.feat.battle',
    descKey: 'cheat.feat.battle.desc',
    icon: Sliders,
    hotkey: 'F5',
    defaultEnabled: false,
  },
];

export function CheatView() {
  const { t } = useT();
  const cheatStates = useAppStore((state) => state.cheatStates);
  const setCheatState = useAppStore((state) => state.setCheatState);
  const backendConnected = useAppStore((state) => state.backendConnected);

  const toggleFeature = (id: string, enabled: boolean) => {
    // Optimistic toggle; the engine's `cheat_status` event re-syncs on reply.
    setCheatState(id, enabled);
    ipc.setCheatEnabled(id, enabled);
  };

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto">
      <SectionHeader
        icon={<Sparkles className="h-5 w-5" />}
        title={t('cheat.title')}
        badge={
          <Badge variant={backendConnected ? 'emerald' : 'neutral'} dot={backendConnected}>
            {backendConnected ? t('cheat.hooks_active') : t('status.offline')}
          </Badge>
        }
        description={t('cheat.desc')}
        actions={
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>{t('cheat.safe_badge')}</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          const enabled = cheatStates[item.id] ?? item.defaultEnabled;

          return (
            <Card
              key={item.id}
              className={cn('p-4 flex items-center justify-between', enabled && 'border-accent/30')}
            >
              <div className="flex items-start gap-3.5 pr-4">
                <div
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    enabled
                      ? 'bg-accent/15 border-accent/30 text-accent-soft'
                      : 'bg-white/[0.03] border-hairline text-ink-3'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-ink">{t(item.nameKey)}</h3>
                    {item.hotkey && (
                      <span className="flex items-center gap-1 text-ink-4">
                        <Keyboard className="h-2.5 w-2.5" aria-hidden="true" />
                        <Kbd>{item.hotkey}</Kbd>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-3 mt-1 leading-relaxed">{t(item.descKey)}</p>
                </div>
              </div>

              <Switch
                checked={enabled}
                onCheckedChange={(checked) => toggleFeature(item.id, checked)}
                aria-label={t(item.nameKey)}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
