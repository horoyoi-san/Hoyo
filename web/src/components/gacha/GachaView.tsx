import { Star, TrendingUp } from 'lucide-react';
import { Badge, Card, SectionHeader, StatCard } from '../ui';
import { useT } from '../../lib/hooks';
import { cn } from '../../lib/utils';

const SAMPLE_WARPS = [
  { id: 1, name: 'Acheron', rank: 5, pity: 78, banner: 'Blissful Otherworld', early: false },
  { id: 2, name: 'Light Cone: Along the Passing Shore', rank: 5, pity: 75, banner: 'Blissful Otherworld', early: false },
  { id: 3, name: 'Sparkle', rank: 5, pity: 62, banner: 'Thousand Breezes', early: false },
  { id: 4, name: 'Ruan Mei', rank: 5, pity: 21, banner: 'Thousand Breezes', early: true },
  { id: 5, name: 'Aventurine', rank: 5, pity: 71, banner: 'Gilded Imagination', early: false },
];

export function GachaView() {
  const { t } = useT();

  return (
    <div className="h-full flex flex-col gap-5 p-6 overflow-y-auto">
      <SectionHeader
        icon={<Star className="h-5 w-5" />}
        title={t('gacha.title')}
        badge={
          <Badge variant="gold" className="uppercase tracking-wider">
            {t('demo.badge')}
          </Badge>
        }
        description={t('gacha.desc')}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('gacha.kpi.pity')} value="42 / 90" tone="violet" icon={<Star className="h-4 w-4" />} />
        <StatCard label={t('gacha.kpi.avg')} value="62.3" tone="emerald" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label={t('gacha.kpi.win5050')} value="75.0%" tone="gold" icon={<Star className="h-4 w-4 fill-current" />} />
        <StatCard label={t('gacha.kpi.jades')} value="124,800" tone="neutral" />
      </div>

      {/* History */}
      <Card className="flex-1 min-h-0 flex flex-col" flat>
        <div className="flex items-center justify-between pb-3 border-b border-hairline">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-2">{t('gacha.history')}</h2>
          <span className="text-[10px] text-ink-4">{t('demo.badge.desc')}</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-hairline">
          {SAMPLE_WARPS.map((warp) => (
            <div key={warp.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <Star
                className={cn('h-4 w-4 shrink-0', warp.rank === 5 ? 'text-gold fill-current' : 'text-violet-400 fill-current')}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-ink truncate">{warp.name}</div>
                <div className="text-[10px] text-ink-4 truncate">{warp.banner}</div>
              </div>
              {warp.early && (
                <Badge variant="amber" className="text-[9px] uppercase">
                  {t('gacha.early_pull')}
                </Badge>
              )}
              <span className="font-mono text-[11px] text-ink-3 shrink-0">
                {warp.pity} {t('gacha.pity_unit')}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
