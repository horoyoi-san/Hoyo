import { Award, Globe, Zap } from 'lucide-react';
import { Badge, Card, Input, SectionHeader } from '../ui';
import { useT } from '../../lib/hooks';
import { cn } from '../../lib/utils';

interface Relic {
  slot: string;
  name: string;
  mainStat: string;
  substats: string[];
  cv: number;
}

const SAMPLE_RELICS: Relic[] = [
  { slot: 'Head', name: 'Salsotto Terminal', mainStat: 'HP +705', substats: ['CR +10.9%', 'CD +25.0%', 'SPD +9'], cv: 35.9 },
  { slot: 'Hands', name: 'Izumo Gensei', mainStat: 'ATK +352', substats: ['CR +12.4%', 'CD +21.8%', 'ATK% +8.4%'], cv: 34.2 },
  { slot: 'Body', name: 'Penacony Land of Dreams', mainStat: 'CR +32.4%', substats: ['CD +17.9%', 'SPD +6', 'EHR +8.2%'], cv: 32.4 },
  { slot: 'Feet', name: 'Fleet of the Ageless', mainStat: 'SPD +25', substats: ['CD +19.4%', 'ATK% +9.6%', 'HP +84'], cv: 29.1 },
  { slot: 'Planar Sphere', name: 'Inert Salsotto', mainStat: 'Lightning DMG +38.8%', substats: ['CR +9.7%', 'CD +23.3%', 'ATK +52'], cv: 33.0 },
  { slot: 'Link Rope', name: 'Sprightly Vonwacq', mainStat: 'ERR +19.4%', substats: ['CR +11.6%', 'CD +20.1%', 'SPD +5'], cv: 31.7 },
];

export function UidView() {
  const { t } = useT();

  const totalCv = SAMPLE_RELICS.reduce((sum, relic) => sum + relic.cv, 0);

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto">
      <SectionHeader
        icon={<Globe className="h-5 w-5" />}
        title={t('uid.title')}
        badge={
          <Badge variant="gold" className="uppercase tracking-wider">
            {t('demo.badge')}
          </Badge>
        }
        description={t('uid.desc')}
        actions={
          <div className="w-56">
            <Input
              defaultValue="100272811"
              className="font-mono text-xs"
              aria-label={t('uid.input')}
              placeholder={t('uid.input')}
            />
          </div>
        }
      />

      {/* Profile summary */}
      <Card className="flex items-center gap-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-700/40 border border-accent/30 text-2xl font-bold text-white font-mono">
          82
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">Acheron</h2>
            <Badge variant="violet">E2S1</Badge>
          </div>
          <div className="text-[11px] text-ink-3 mt-0.5">UID 100272811 · {t('uid.server_asia')}</div>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-ink-4">{t('uid.total_cv')}</div>
            <div className="text-lg font-bold font-mono text-gold">{totalCv.toFixed(1)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-ink-4">{t('uid.relics')}</div>
            <div className="text-lg font-bold font-mono text-ink">{SAMPLE_RELICS.length}</div>
          </div>
        </div>
      </Card>

      {/* Relic grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SAMPLE_RELICS.map((relic) => (
          <Card key={relic.slot} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-ink">{relic.name}</div>
                <div className="text-[10px] text-ink-4 uppercase tracking-wider">{relic.slot}</div>
              </div>
              <Badge variant={relic.cv >= 35 ? 'emerald' : relic.cv >= 30 ? 'gold' : 'neutral'} className="font-mono">
                CV {relic.cv.toFixed(1)}
              </Badge>
            </div>

            <div className="text-[11px] text-accent-soft font-medium">{relic.mainStat}</div>

            <div className="space-y-0.5 font-mono text-[10px] text-ink-3">
              {relic.substats.map((sub) => (
                <div key={sub} className="flex items-center gap-1.5">
                  <Zap className="h-2.5 w-2.5 text-ink-4" aria-hidden="true" />
                  {sub}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-hairline">
              <div className="h-1 rounded-full bg-inset overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    relic.cv >= 35 ? 'bg-emerald-500' : relic.cv >= 30 ? 'bg-gold' : 'bg-accent/50'
                  )}
                  style={{ width: `${Math.min(relic.cv / 45, 1) * 100}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-[11px] text-ink-4 flex items-center gap-1.5">
        <Award className="h-3.5 w-3.5" aria-hidden="true" />
        {t('demo.badge.desc')}
      </p>
    </div>
  );
}
